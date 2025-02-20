import {useEffect, useState} from 'react';
import styled from '@emotion/styled';
import {motion} from 'framer-motion';

import ExternalLink from 'sentry/components/links/externalLink';
import MultiPlatformPicker from 'sentry/components/multiPlatformPicker';
import {PlatformKey} from 'sentry/data/platformCategories';
import {t, tct} from 'sentry/locale';
import testableTransition from 'sentry/utils/testableTransition';
import StepHeading from 'sentry/views/onboarding/components/stepHeading';

import CreateProjectsFooter from './components/createProjectsFooter';
import {StepProps} from './types';
import {usePersistedOnboardingState} from './utils';

function OnboardingPlatform(props: StepProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformKey[]>([]);
  const addPlatform = (platform: PlatformKey) => {
    setSelectedPlatforms([...selectedPlatforms, platform]);
  };
  const removePlatform = (platform: PlatformKey) => {
    setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform));
  };

  const [clientState] = usePersistedOnboardingState();
  useEffect(() => {
    if (clientState) {
      setSelectedPlatforms(clientState.selectedPlatforms);
    }
  }, [clientState]);

  const clearPlatforms = () => setSelectedPlatforms([]);
  return (
    <Wrapper>
      <StepHeading step={props.stepIndex}>
        {t('Select the platforms you want to monitor')}
      </StepHeading>
      <motion.div
        transition={testableTransition()}
        variants={{
          initial: {y: 30, opacity: 0},
          animate: {y: 0, opacity: 1},
          exit: {opacity: 0},
        }}
      >
        <p>
          {tct(
            `Variety is the spice of application monitoring.
           Get started by selecting platforms for your Front End, Back End and/or Mobile applications.
           [link:View the full list].`,
            {link: <ExternalLink href="https://docs.sentry.io/platforms/" />}
          )}
        </p>
        <MultiPlatformPicker
          noAutoFilter
          source="targeted-onboarding"
          {...props}
          removePlatform={removePlatform}
          addPlatform={addPlatform}
          platforms={selectedPlatforms}
        />
      </motion.div>
      <CreateProjectsFooter
        {...props}
        clearPlatforms={clearPlatforms}
        platforms={selectedPlatforms}
      />
    </Wrapper>
  );
}

export default OnboardingPlatform;

const Wrapper = styled('div')`
  max-width: 850px;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
`;
