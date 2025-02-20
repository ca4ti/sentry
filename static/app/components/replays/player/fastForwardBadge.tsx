import styled from '@emotion/styled';

import Tooltip from 'sentry/components/tooltip';
import {IconArrow} from 'sentry/icons';
import {t} from 'sentry/locale';
import space from 'sentry/styles/space';

type Props = {
  speed: number;
};

function FastForwardBadge({speed}: Props) {
  return (
    <Badge>
      <FastForwardTooltip title={t('Fast forwarding')}>
        <IconArrow size="sm" direction="right" />
        {speed}x
      </FastForwardTooltip>
    </Badge>
  );
}

/* Position the badge in the corner */
const Badge = styled('div')`
  display: grid;
  align-items: end;
  justify-items: start;
`;

/* Badge layout and style */
const FastForwardTooltip = styled(Tooltip)`
  display: grid;
  grid-template-columns: max-content max-content;
  gap: ${space(0.5)};
  align-items: center;

  background: ${p => p.theme.gray300};
  color: ${p => p.theme.white};
  padding: ${space(1.5)} ${space(2)};
  border-bottom-left-radius: ${p => p.theme.borderRadius};
  border-top-right-radius: ${p => p.theme.borderRadius};
  z-index: ${p => p.theme.zIndex.initial};
`;

export default FastForwardBadge;
