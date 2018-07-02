// @flow
import * as React from 'react';
import { inject, observer } from 'mobx-react';
import Loadable from 'react-loadable';
import { Route, Switch, Redirect } from 'react-router-dom';

import _debug from '../../../../app/src/app/utils/debug';
import Notifications from '../../../../app/src/app/pages/common/Notifications';
import Loading from '../../../../app/src/app/components/Loading';

import send, { DNT } from 'common/utils/analytics';

import Modals from '../../../../app/src/app/pages/common/Modals';
import Sandbox from './Sandbox';
import NewSandbox from './NewSandbox';
import { Container, Content } from '../../../../app/src/app/pages/elements';

const routeDebugger = _debug('cs:app:router');

const SignIn = Loadable({
  loader: () =>
    import(/* webpackChunkName: 'page-sign-in' */ '../../../../app/src/app/pages/common/SignIn'),
  LoadingComponent: Loading,
});
const Live = Loadable({
  loader: () =>
    import(/* webpackChunkName: 'page-sign-in' */ '../../../../app/src/app/pages/Live'),
  LoadingComponent: Loading,
});
const ZeitSignIn = Loadable({
  loader: () =>
    import(/* webpackChunkName: 'page-zeit' */ '../../../../app/src/app/pages/common/ZeitAuth'),
  LoadingComponent: Loading,
});
const NotFound = Loadable({
  loader: () =>
    import(/* webpackChunkName: 'page-not-found' */ '../../../../app/src/app/pages/common/NotFound'),
  LoadingComponent: Loading,
});
const Profile = Loadable({
  loader: () =>
    import(/* webpackChunkName: 'page-profile' */ '../../../../app/src/app/pages/Profile'),
  LoadingComponent: Loading,
});
const Search = Loadable({
  loader: () =>
    import(/* webpackChunkName: 'page-search' */ '../../../../app/src/app/pages/Search'),
  LoadingComponent: Loading,
});
const CLI = Loadable({
  loader: () =>
    import(/* webpackChunkName: 'page-cli' */ '../../../../app/src/app/pages/CLI'),
  LoadingComponent: Loading,
});
const GitHub = Loadable({
  loader: () =>
    import(/* webpackChunkName: 'page-github' */ '../../../../app/src/app/pages/GitHub'),
  LoadingComponent: Loading,
});
const CliInstructions = Loadable({
  loader: () =>
    import(/* webpackChunkName: 'page-cli-instructions' */ '../../../../app/src/app/pages/CliInstructions'),
  LoadingComponent: Loading,
});
const Patron = Loadable({
  loader: () =>
    import(/* webpackChunkName: 'page-patron' */ '../../../../app/src/app/pages/Patron'),
  LoadingComponent: Loading,
});
const Terms = Loadable({
  loader: () =>
    import(/* webpackChunkName: 'page-terms' */ '../../../../app/src/app/pages/Terms'),
  LoadingComponent: Loading,
});

type Props = {
  signals: any,
};

class Routes extends React.Component<Props> {
  componentWillUnmount() {
    this.props.signals.appUnmounted();
  }

  shouldComponentUpdate() {
    // Without this the app won't update on route changes, we've tried using
    // `withRouter`, but it caused the app to remount on every route change.
    return true;
  }

  render() {
    return (
      <Container>
        <Route
          path="/"
          render={({ location }) => {
            if (process.env.NODE_ENV === 'production') {
              routeDebugger(
                `Sending '${location.pathname + location.search}' to ga.`
              );
              if (typeof window.ga === 'function' && !DNT) {
                window.ga('set', 'page', location.pathname + location.search);

                send('pageview');
              }
            }
            return null;
          }}
        />
        <Notifications />
        <Content>
          <Switch>
            <Route exact path="/" render={() => <Redirect to="/s" />} />
            <Route exact path="/s/github" component={GitHub} />
            <Route exact path="/s/cli" component={CliInstructions} />
            <Route exact path="/s" component={NewSandbox} />
            <Route path="/s/:id*" component={Sandbox} />
            <Route path="/live/:id" component={Live} />
            <Route path="/signin/:jwt?" component={SignIn} />
            <Route path="/u/:username" component={Profile} />
            <Route path="/search" component={Search} />
            <Route path="/patron" component={Patron} />
            <Route path="/cli/login" component={CLI} />
            <Route path="/legal" component={Terms} />
            <Route path="/auth/zeit" component={ZeitSignIn} />
            <Route component={NotFound} />
          </Switch>
        </Content>
        <Modals />
      </Container>
    );
  }
}

export default inject('signals', 'store')(observer(Routes));
