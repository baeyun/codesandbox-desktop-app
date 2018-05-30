import React from 'react';
import { render } from 'react-dom';
import { ThemeProvider } from 'styled-components';
import { Router } from 'react-router-dom';
import history from '../../../app/src/app/utils/history';
import _debug from '../../../app/src/app/utils/debug';
import VERSION from 'common/version';
import registerServiceWorker from 'common/registerServiceWorker';
import requirePolyfills from 'common/load-dynamic-polyfills';
import 'normalize.css';
import 'common/global.css';
import theme from 'common/theme';
import { Provider } from 'mobx-react';
import controller from '../../../app/src/app/controller';

import App from '../../../app/src/app/pages/index';
import '../../../app/src/app/split-pane.css';
import logError from '../../../app/src/app/utils/error';

const debug = _debug('cs:app');

if (process.env.NODE_ENV === 'production') {
  try {
    Raven.config('https://3943f94c73b44cf5bb2302a72d52e7b8@sentry.io/155188', {
      release: VERSION,
      ignoreErrors: [
        // Random plugins/extensions
        'top.GLOBALS',
        // See: http://blog.errorception.com/2012/03/tale-of-unfindable-js-error. html
        'originalCreateNotification',
        'canvas.contentDocument',
        'MyApp_RemoveAllHighlights',
        'http://tt.epicplay.com',
        "Can't find variable: ZiteReader",
        'jigsaw is not defined',
        'ComboSearch is not defined',
        'http://loading.retry.widdit.com/',
        'atomicFindClose',
        // Facebook borked
        'fb_xd_fragment',
        // ISP "optimizing" proxy - `Cache-Control: no-transform` seems to
        // reduce this. (thanks @acdha)
        // See http://stackoverflow.com/questions/4113268
        'bmi_SafeAddOnload',
        'EBCallBackMessageReceived',
        // See http://toolbar.conduit.com/Developer/HtmlAndGadget/Methods/JSInjection.aspx
        'conduitPage',
      ],
      ignoreUrls: [
        // Facebook flakiness
        /graph\.facebook\.com/i,
        // Facebook blocked
        /connect\.facebook\.net\/en_US\/all\.js/i,
        // Woopra flakiness
        /eatdifferent\.com\.woopra-ns\.com/i,
        /static\.woopra\.com\/js\/woopra\.js/i,
        // Chrome extensions
        /extensions\//i,
        /^chrome:\/\//i,
        // Other plugins
        /127\.0\.0\.1:4001\/isrunning/i, // Cacaoweb
        /webappstoolbarba\.texthelp\.com\//i,
        /metrics\.itunes\.apple\.com\.edgesuite\.net\//i,
        // Monaco debuggers
        'https://codesandbox.io/public/vs/language/typescript/lib/typescriptServices.js',
      ],
    }).install();
  } catch (error) {
    console.error(error);
  }
}

window.__isTouch = !matchMedia('(pointer:fine)').matches;

requirePolyfills().then(() => {
  const rootEl = document.getElementById('root');

  const showNotification = (message, type) =>
    controller.getSignal('notificationAdded')({
      type,
      message,
    });

  registerServiceWorker('/service-worker.js', {
    onUpdated: () => {
      debug('Updated SW');
      controller.getSignal('setUpdateStatus')({ status: 'available' });
    },
    onInstalled: () => {
      debug('Installed SW');
      showNotification(
        'CodeSandbox has been installed, it now works offline!',
        'success'
      );
    },
  });

  try {
    render(
      <Provider {...controller.provide()}>
        <ThemeProvider theme={theme}>
          <Router history={history}>
            <App />
          </Router>
        </ThemeProvider>
      </Provider>,
      rootEl
    );
  } catch (e) {
    logError(e);
  }
});
