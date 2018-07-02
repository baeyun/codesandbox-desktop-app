import React from 'react';
import { inject } from 'mobx-react';

import Button from '../../../../../app/src/app/components/Button';
import PlusIcon from 'react-icons/lib/go/plus';
import Row from 'common/components/flex/Row';

import MaxWidth from 'common/components/flex/MaxWidth';
import Centered from 'common/components/flex/Centered';
import Margin from 'common/components/spacing/Margin';
import Title from '../../../../../app/src/app/components/Title';
import NewSandbox from '../../../../../app/src/app/components/NewSandbox';

class NewSandboxComponent extends React.PureComponent {
  componentDidMount() {
    this.props.signals.sandboxPageMounted();
  }

  render() {
    let props = this.props;

    return (
      <MaxWidth>
        <Margin style={{ height: '100%' }} vertical={1.5} horizontal={1.5}>
          <Margin top={9}>
            <Centered horizontal vertical>
              <Title>Welcome, Create a New Sandbox</Title>
              <Margin top={2}>
                <Button
                  big
                  onClick={() => {
                    props.signals.modalOpened({
                      modal: 'newSandbox',
                    });
                  }}
                  {...props}
                >
                  <Row>
                    <PlusIcon height={55} style={{ marginRight: '0.5rem' }} />{' '}
                    New Sandbox
                  </Row>
                </Button>
              </Margin>
            </Centered>
          </Margin>
        </Margin>
      </MaxWidth>
    );
  }
}

export default inject('signals')(NewSandboxComponent);
