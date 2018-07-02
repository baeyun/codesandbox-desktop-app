// @flow
import * as React from 'react';
import { ThemeProvider } from 'styled-components';
import { Prompt } from 'react-router-dom';
import { reaction } from 'mobx';
import { TextOperation } from 'ot';
import { inject, observer } from 'mobx-react';
import getTemplateDefinition from 'common/templates';
import type { ModuleError } from 'common/types';

import CodeEditor from '../../../../../../../app/src/app/components/CodeEditor';
import type {
  Editor,
  Settings,
} from '../../../../../../../app/src/app/components/CodeEditor/types';
import DevTools from '../../../../../../../app/src/app/components/Preview/DevTools';
import FilePath from '../../../../../../../app/src/app/components/CodeEditor/FilePath';

import Tabs from '../../../../../../../app/src/app/pages/Sandbox/Editor/Content/Tabs';
import { FullSize } from '../../../../../../../app/src/app/pages/Sandbox/Editor/Content/elements';

const settings = store =>
  ({
    fontFamily: store.preferences.settings.fontFamily,
    fontSize: store.preferences.settings.fontSize,
    lineHeight: store.preferences.settings.lineHeight,
    autoCompleteEnabled: store.preferences.settings.autoCompleteEnabled,
    autoDownloadTypes: store.preferences.settings.autoDownloadTypes,
    vimMode: store.preferences.settings.vimMode,
    lintEnabled: store.preferences.settings.lintEnabled,
    codeMirror: store.preferences.settings.codeMirror,
    tabWidth: store.preferences.settings.prettierConfig
      ? store.preferences.settings.prettierConfig.tabWidth || 2
      : 2,
    enableLigatures: store.preferences.settings.enableLigatures,
  }: Settings);

type Props = {
  signals: any,
  store: any,
};

type State = {
  width: ?number,
  height: ?number,
};

class EditorPreview extends React.Component<Props, State> {
  state = { width: null, height: null };
  interval: number;
  disposeEditorChange: Function;
  el: ?HTMLElement;
  devtools: DevTools;

  componentDidMount() {
    this.props.signals.editor.contentMounted();
    this.disposeEditorChange = reaction(
      () => this.props.store.preferences.settings.codeMirror,
      () => this.forceUpdate()
    );

    window.addEventListener('resize', this.getBounds);

    this.interval = setInterval(() => {
      this.getBounds();
    }, 1000);
  }

  componentWillUnmount() {
    this.disposeEditorChange();
    window.removeEventListener('resize', this.getBounds);
    clearInterval(this.interval);
  }

  getBounds = el => {
    if (el) {
      this.el = this.el || el;
    }
    if (this.el) {
      const { width, height } = this.el.getBoundingClientRect();

      if (width !== this.state.width || height !== this.state.height) {
        this.setState({ width, height });
      }
    }
  };

  handleToggleDevtools = showDevtools => {
    if (this.devtools) {
      if (showDevtools) {
        this.devtools.openDevTools();
      } else {
        this.devtools.hideDevTools();
      }
    }
  };

  onInitialized = (editor: Editor) => {
    const store = this.props.store;
    let isChangingSandbox = false;

    const disposeSandboxChangeHandler = reaction(
      () => store.editor.currentSandbox,
      newSandbox => {
        isChangingSandbox = !!editor.changeSandbox;

        // Put in a timeout so we allow the actions after the fork to execute first as well.
        setTimeout(() => {
          if (editor.changeSandbox) {
            const { parsed } = store.editor.parsedConfigurations.package;
            editor
              .changeSandbox(
                newSandbox,
                store.editor.currentModule,
                parsed ? parsed.dependencies : newSandbox.npmDependencies.toJS()
              )
              .then(() => {
                isChangingSandbox = false;
              });
          }
        });
      }
    );
    const disposeErrorsHandler = reaction(
      () => store.editor.errors.map(error => error),
      (errors: Array<ModuleError>) => {
        if (editor.setErrors) {
          editor.setErrors(errors);
        }
      }
    );
    const disposeCorrectionsHandler = reaction(
      () => store.editor.corrections.map(correction => correction),
      corrections => {
        if (editor.setCorrections) {
          editor.setCorrections(corrections);
        }
      }
    );
    const disposeGlyphsHandler = reaction(
      () => store.editor.glyphs.map(glyph => glyph),
      glyphs => {
        if (editor.setGlyphs) {
          editor.setGlyphs(glyphs);
        }
      }
    );
    const disposeModulesHandler = reaction(this.detectStructureChange, () => {
      if (isChangingSandbox) {
        return;
      }
      if (editor.updateModules) {
        editor.updateModules();
      }
    });
    const disposePreferencesHandler = reaction(
      () => settings(store),
      newSettings => {
        if (editor.changeSettings) {
          editor.changeSettings(newSettings);
        }
      },
      {
        compareStructural: true,
      }
    );
    const disposeResizeHandler = reaction(
      () => [
        store.preferences.settings.zenMode,
        store.workspace.openedWorkspaceItem,
      ],
      () => {
        setTimeout(() => {
          this.getBounds();
        });
      }
    );
    const disposePackageHandler = reaction(
      () => store.editor.parsedConfigurations.package,
      () => {
        const { parsed } = store.editor.parsedConfigurations.package;
        if (parsed) {
          const { dependencies = {} } = parsed;

          if (editor.changeDependencies) {
            editor.changeDependencies(dependencies);
          }
        }
      }
    );
    const disposeTSConfigHandler = reaction(
      () => store.editor.parsedConfigurations.typescript,
      () => {
        if (store.editor.parsedConfigurations.typescript) {
          const { parsed } = store.editor.parsedConfigurations.typescript;
          if (parsed) {
            if (editor.setTSConfig) {
              editor.setTSConfig(parsed);
            }
          }
        }
      }
    );
    const disposeLiveHandler = reaction(
      () => store.live.receivingCode,
      () => {
        if (editor.setReceivingCode) {
          editor.setReceivingCode(store.live.receivingCode);
        }
      }
    );

    const disposePendingOperationHandler = reaction(
      () =>
        store.editor.pendingOperation &&
        store.editor.pendingOperation.map(x => x),
      () => {
        if (store.editor.pendingOperation && store.live.isLive) {
          if (editor.setReceivingCode) {
            editor.setReceivingCode(true);
          }
          if (editor.applyOperation) {
            editor.applyOperation(
              TextOperation.fromJSON(store.editor.pendingOperation)
            );
          } else {
            try {
              if (editor.currentModule) {
                const operation = TextOperation.fromJSON(
                  store.editor.pendingOperation
                );

                this.props.signals.editor.codeChanged({
                  code: operation.apply(editor.currentModule.code || ''),
                  moduleShortid: editor.currentModule.shortid,
                });
              }
            } catch (e) {
              console.error(e);
            }
          }
          if (editor.setReceivingCode) {
            editor.setReceivingCode(false);
          }
          this.props.signals.live.onOperationApplied();
        }
      }
    );

    const updateUserSelections = () => {
      if (store.editor.pendingUserSelections) {
        if (editor.updateUserSelections) {
          if (store.live.isLive) {
            requestAnimationFrame(() => {
              editor.updateUserSelections(store.editor.pendingUserSelections);
              this.props.signals.live.onSelectionDecorationsApplied();
            });
          } else {
            this.props.signals.live.onSelectionDecorationsApplied();
          }
        }
      }
    };
    const disposeLiveSelectionHandler = reaction(
      () => store.editor.pendingUserSelections.map(x => x),
      updateUserSelections
    );
    updateUserSelections();

    const disposeModuleHandler = reaction(
      () => [store.editor.currentModule, store.editor.currentModule.code],
      ([newModule]) => {
        if (isChangingSandbox) {
          return;
        }
        const editorModule = editor.currentModule;

        const changeModule = editor.changeModule;
        if (newModule !== editorModule && changeModule) {
          const errors = store.editor.errors.map(e => e);
          const corrections = store.editor.corrections.map(e => e);
          changeModule(newModule, errors, corrections);
        } else if (editor.changeCode) {
          // Only code changed from outside the editor
          editor.changeCode(newModule.code || '');
        }
      }
    );
    const disposeToggleDevtools = reaction(
      () => this.props.store.preferences.showDevtools,
      showDevtools => {
        this.handleToggleDevtools(showDevtools);
      }
    );

    return () => {
      disposeErrorsHandler();
      disposeCorrectionsHandler();
      disposeModulesHandler();
      disposePreferencesHandler();
      disposePackageHandler();
      disposeTSConfigHandler();
      disposeSandboxChangeHandler();
      disposeModuleHandler();
      disposeToggleDevtools();
      disposeResizeHandler();
      disposeGlyphsHandler();
      disposeLiveHandler();
      disposePendingOperationHandler();
      disposeLiveSelectionHandler();
    };
  };

  detectStructureChange = () => {
    const sandbox = this.props.store.editor.currentSandbox;

    return String(
      sandbox.modules
        .map(module => module.id + module.directoryShortid + module.title)
        .concat(
          sandbox.directories.map(
            directory => directory.directoryShortid + directory.title
          )
        )
    );
  };

  sendTransforms = operation => {
    const currentModuleShortid = this.props.store.editor.currentModuleShortid;

    this.props.signals.live.onTransformMade({
      moduleShortid: currentModuleShortid,
      operation: operation.toJSON(),
    });
  };

  render() {
    const { signals, store } = this.props;
    const currentModule = store.editor.currentModule;
    const notSynced = !store.editor.isAllModulesSynced;
    const sandbox = store.editor.currentSandbox;
    const preferences = store.preferences;
    const { x, y, width, content } = store.editor.previewWindow;

    const windowVisible = !!content;

    const windowRightSize = -x + width + 16;

    const isVerticalMode = this.state.width
      ? this.state.width / 4 > this.state.width - windowRightSize
      : false;

    let editorWidth = isVerticalMode
      ? '100%'
      : `calc(100% - ${windowRightSize}px)`;
    let editorHeight = isVerticalMode ? `${y + 16}px` : '100%';

    if (!windowVisible) {
      editorWidth = '100%';
      editorHeight = '100%';
    }

    return (
      <ThemeProvider
        theme={{
          templateColor: getTemplateDefinition(sandbox.template).color,
        }}
      >
        <FullSize>
          <Prompt
            when={notSynced && !store.editor.isForkingSandbox}
            message={() =>
              'You have not saved this sandbox, are you sure you want to navigate away?'
            }
          />
          {preferences.settings.zenMode ? (
            <FilePath
              modules={sandbox.modules}
              directories={sandbox.directories}
              currentModule={currentModule}
              workspaceHidden={!store.workspace.openedWorkspaceItem}
              toggleWorkspace={() => {
                signals.workspace.toggleCurrentWorkspaceItem();
              }}
              exitZenMode={() =>
                this.props.signals.preferences.settingChanged({
                  name: 'zenMode',
                  value: false,
                })
              }
            />
          ) : (
            <Tabs />
          )}
          <div
            ref={this.getBounds}
            style={{
              position: 'relative',
              display: 'flex',
              flex: 1,
              marginTop: preferences.settings.zenMode ? 0 : '2.5rem',
            }}
          >
            <CodeEditor
              onInitialized={this.onInitialized}
              sandbox={sandbox}
              currentModule={currentModule}
              isModuleSynced={store.editor.isModuleSynced(
                currentModule.shortid
              )}
              width={editorWidth}
              height={editorHeight}
              settings={settings(store)}
              sendTransforms={this.sendTransforms}
              readOnly={store.live.isLive && !store.live.isCurrentEditor}
              isLive={store.live.isLive}
              onCodeReceived={signals.live.onCodeReceived}
              onSelectionChanged={signals.live.onSelectionChanged}
              onNpmDependencyAdded={name => {
                if (sandbox.owned) {
                  signals.editor.addNpmDependency({ name, isDev: true });
                }
              }}
              onChange={code =>
                signals.editor.codeChanged({
                  code,
                  moduleShortid: currentModule.shortid,
                })
              }
              onModuleChange={moduleId =>
                signals.editor.moduleSelected({ id: moduleId })
              }
              onSave={code =>
                signals.editor.codeSaved({
                  code,
                  moduleShortid: currentModule.shortid,
                })
              }
              tsconfig={
                store.editor.parsedConfigurations.typescript &&
                store.editor.parsedConfigurations.typescript.parsed
              }
            />
          </div>

          <DevTools
            ref={component => {
              if (component) {
                this.devtools = component;
              }
            }}
            setDragging={dragging => {
              if (dragging) {
                this.props.signals.editor.resizingStarted();
              } else {
                this.props.signals.editor.resizingStopped();
              }
            }}
            sandboxId={sandbox.id}
            shouldExpandDevTools={store.preferences.showDevtools}
            zenMode={preferences.settings.zenMode}
            setDevToolsOpen={open =>
              this.props.signals.preferences.setDevtoolsOpen({ open })
            }
          />
        </FullSize>
      </ThemeProvider>
    );
  }
}

export default inject('signals', 'store')(observer(EditorPreview));
