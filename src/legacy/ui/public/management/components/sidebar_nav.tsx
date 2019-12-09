/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { EuiIcon, EuiSideNav, IconType, EuiScreenReaderOnly } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
// import { IndexedArray } from 'ui/indexed_array';

/*
interface Subsection {
  disabled: boolean;
  visible: boolean;
  id: string;
  display: string;
  url?: string;
  icon?: IconType;
}
*/

interface Subsection {
  // disabled: boolean;
  // visible: boolean;
  id: string;
  title: string;
  url?: string;
  euiIconType?: IconType;
}

interface Section extends Subsection {
  apps: Subsection[];
}

// const sectionVisible = (section: Subsection) => !section.disabled && section.visible;
const sectionToNav = (selectedId: string) => ({ title, id, url, euiIconType }: Subsection) => ({
  id,
  name: title,
  icon: euiIconType ? <EuiIcon type={euiIconType} /> : null,
  isSelected: selectedId === id,
  href: url,
  'data-test-subj': id,
});

export const sideNavItems = (sections: Section[], selectedId: string) =>
  sections
    // .filter(sectionVisible)
    // .filter(section => section.items.filter(sectionVisible).length)
    .map(section => ({
      // items: section.items.filter(sectionVisible).map(sectionToNav(selectedId)),
      items: section.apps.map(sectionToNav(selectedId)),
      ...sectionToNav(selectedId)(section),
    }));

interface SidebarNavProps {
  sections: Section[];
  selectedId: string;
}

interface SidebarNavState {
  isSideNavOpenOnMobile: boolean;
}

export class SidebarNav extends React.Component<SidebarNavProps, SidebarNavState> {
  constructor(props: SidebarNavProps) {
    super(props);
    this.state = {
      isSideNavOpenOnMobile: false,
    };
  }

  public render() {
    const HEADER_ID = 'management-nav-header';

    return (
      <>
        <EuiScreenReaderOnly>
          <h2 id={HEADER_ID}>
            {i18n.translate('common.ui.management.nav.label', {
              defaultMessage: 'Management',
            })}
          </h2>
        </EuiScreenReaderOnly>
        <EuiSideNav
          aria-labelledby={HEADER_ID}
          mobileTitle={this.renderMobileTitle()}
          isOpenOnMobile={this.state.isSideNavOpenOnMobile}
          toggleOpenOnMobile={this.toggleOpenOnMobile}
          items={sideNavItems(this.props.sections, this.props.selectedId)}
          className="mgtSideBarNav"
        />
      </>
    );
  }

  private renderMobileTitle() {
    return <FormattedMessage id="common.ui.management.nav.menu" defaultMessage="Management menu" />;
  }

  private toggleOpenOnMobile = () => {
    this.setState({
      isSideNavOpenOnMobile: !this.state.isSideNavOpenOnMobile,
    });
  };
}
