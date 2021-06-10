import * as React from 'react';

import HookStore from 'app/stores/hookStore';
import {Organization} from 'app/types';
import {HookName, Hooks} from 'app/types/hooks';
import withOrganization from 'app/utils/withOrganization';
import SettingsNavigation from 'app/views/settings/components/settingsNavigation';
import navigationConfiguration from 'app/views/settings/organization/navigationConfiguration';
import {NavigationSection} from 'app/views/settings/types';

type Props = {
  organization: Organization;
};

type State = {
  hookConfigs: NavigationSection[];
  hooks: React.ReactElement[];
};

class OrganizationSettingsNavigation extends React.Component<Props, State> {
  state = this.getHooks();

  componentDidMount() {
    // eslint-disable-next-line react/no-did-mount-set-state
    this.setState(this.getHooks());
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  /**
   * TODO(epurkhiser): Becase the settings organization navigation hooks
   * do not conform to a normal component style hook, and take a single
   * parameter 'organization', we cannot use the `Hook` component here,
   * and must resort to using listening to the HookStore to retrieve hook data.
   *
   * We should update the hook interface for the two hooks used here
   */
  unsubscribe = HookStore.listen(
    (hookName: HookName, hooks: Hooks['settings:organization-navigation-config'][]) => {
      this.handleHooks(hookName, hooks);
    },
    undefined
  );

  getHooks() {
    // Allow injection via getsentry et all
    const {organization} = this.props as Props;

    return {
      hookConfigs: HookStore.get('settings:organization-navigation-config').map(cb =>
        cb(organization)
      ),
      hooks: HookStore.get('settings:organization-navigation').map(cb =>
        cb(organization)
      ),
    };
  }

  handleHooks(name: HookName, hooks: Hooks['settings:organization-navigation-config'][]) {
    const org = this.props.organization;
    if (name !== 'settings:organization-navigation-config') {
      return;
    }
    this.setState({hookConfigs: hooks.map(cb => cb(org))});
  }

  render() {
    const {hooks, hookConfigs} = this.state as State;
    const {organization} = this.props as Props;
    const access = new Set(organization.access);
    const features = new Set(organization.features);

    return (
      <SettingsNavigation
        navigationObjects={navigationConfiguration}
        access={access}
        features={features}
        organization={organization}
        hooks={hooks}
        hookConfigs={hookConfigs}
      />
    );
  }
}

export default withOrganization(OrganizationSettingsNavigation);
