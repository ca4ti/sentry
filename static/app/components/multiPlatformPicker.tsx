import * as React from 'react';
import styled from '@emotion/styled';
import debounce from 'lodash/debounce';
import {PlatformIcon} from 'platformicons';

import Button from 'sentry/components/button';
import ExternalLink from 'sentry/components/links/externalLink';
import ListLink from 'sentry/components/links/listLink';
import NavTabs from 'sentry/components/navTabs';
import {DEFAULT_DEBOUNCE_DURATION} from 'sentry/constants';
import categoryList, {
  filterAliases,
  PlatformKey,
  popularPlatformCategories,
} from 'sentry/data/platformCategories';
import platforms from 'sentry/data/platforms';
import {IconClose, IconProject, IconSearch} from 'sentry/icons';
import {t, tct} from 'sentry/locale';
import {inputStyles} from 'sentry/styles/input';
import space from 'sentry/styles/space';
import {Organization, PlatformIntegration} from 'sentry/types';
import trackAdvancedAnalyticsEvent from 'sentry/utils/analytics/trackAdvancedAnalyticsEvent';
import EmptyMessage from 'sentry/views/settings/components/emptyMessage';

const PLATFORM_CATEGORIES = [{id: 'all', name: t('All')}, ...categoryList] as const;

// Category needs the all option while CategoryObj does not
type Category = typeof PLATFORM_CATEGORIES[number]['id'];
type CategoryObj = typeof categoryList[number];
type Platform = CategoryObj['platforms'][number];

// create a lookup table for each platform
const indexByPlatformByCategory = {} as Record<
  CategoryObj['id'],
  Record<Platform, number>
>;
categoryList.forEach(category => {
  const indexByPlatform = {} as Record<Platform, number>;
  indexByPlatformByCategory[category.id] = indexByPlatform;
  category.platforms.forEach((platform: Platform, index: number) => {
    indexByPlatform[platform] = index;
  });
});

const getIndexOfPlatformInCategory = (
  category: CategoryObj['id'],
  platform: PlatformIntegration
) => {
  const indexByPlatform = indexByPlatformByCategory[category];
  return indexByPlatform[platform.id];
};

const isPopular = (platform: PlatformIntegration) =>
  popularPlatformCategories.includes(
    platform.id as typeof popularPlatformCategories[number]
  );

const popularIndex = (platform: PlatformIntegration) =>
  getIndexOfPlatformInCategory('popular', platform);

const PlatformList = styled('div')`
  display: grid;
  gap: ${space(1)};
  grid-template-columns: repeat(auto-fill, 112px);
  justify-content: center;
  margin-bottom: ${space(2)};
`;

interface PlatformPickerProps {
  addPlatform: (key: PlatformKey) => void;
  organization: Organization;
  platforms: PlatformKey[];
  removePlatform: (key: PlatformKey) => void;
  source: string;
  defaultCategory?: Category;
  listClassName?: string;
  listProps?: React.HTMLAttributes<HTMLDivElement>;
  noAutoFilter?: boolean;
  showOther?: boolean;
}

function PlatformPicker(props: PlatformPickerProps) {
  const {organization, source} = props;
  const [category, setCategory] = React.useState<Category>(
    props.defaultCategory ?? PLATFORM_CATEGORIES[0].id
  );
  const [filter, setFilter] = React.useState<string>(
    props.noAutoFilter ? '' : (props.platforms[0] || '').split('-')[0]
  );

  function getPlatformList() {
    const currentCategory = categoryList.find(({id}) => id === category);

    const filterLowerCase = filter.toLowerCase();

    const subsetMatch = (platform: PlatformIntegration) =>
      platform.id.includes(filterLowerCase) ||
      platform.name.toLowerCase().includes(filterLowerCase) ||
      filterAliases[platform.id]?.some(alias => alias.includes(filterLowerCase));

    const categoryMatch = (platform: PlatformIntegration) =>
      category === 'all' ||
      (currentCategory?.platforms as undefined | string[])?.includes(platform.id);

    const popularTopOfAllCompare = (a: PlatformIntegration, b: PlatformIntegration) => {
      // for the all category, put popular ones at the top in the order they appear in the popular list
      if (category === 'all') {
        if (isPopular(a) && isPopular(b)) {
          // if both popular, maintain ordering from popular list
          return popularIndex(a) - popularIndex(b);
        }
        // if one popular, that one shhould be first
        if (isPopular(a) !== isPopular(b)) {
          return isPopular(a) ? -1 : 1;
        }
        // since the all list is coming from a different source (platforms.json)
        // we can't go off the index of the item in platformCategories.tsx since there is no all list
        return a.id.localeCompare(b.id);
      }
      // maintain ordering otherwise
      return (
        getIndexOfPlatformInCategory(category, a) -
        getIndexOfPlatformInCategory(category, b)
      );
    };

    const filtered = platforms
      .filter(filterLowerCase ? subsetMatch : categoryMatch)
      .sort(popularTopOfAllCompare);

    return props.showOther ? filtered : filtered.filter(({id}) => id !== 'other');
  }

  const platformList = getPlatformList();
  const {addPlatform, removePlatform, listProps, listClassName} = props;

  const logSearch = debounce(() => {
    if (filter) {
      trackAdvancedAnalyticsEvent('growth.platformpicker_search', {
        search: filter.toLowerCase(),
        num_results: platformList.length,
        source,
        organization,
      });
    }
  }, DEFAULT_DEBOUNCE_DURATION);

  React.useEffect(logSearch, [filter]);

  return (
    <React.Fragment>
      <NavContainer>
        <CategoryNav>
          {PLATFORM_CATEGORIES.map(({id, name}) => (
            <ListLink
              key={id}
              onClick={(e: React.MouseEvent) => {
                trackAdvancedAnalyticsEvent('growth.platformpicker_category', {
                  category: id,
                  source,
                  organization,
                });
                setCategory(id);
                setFilter('');
                e.preventDefault();
              }}
              to=""
              isActive={() => id === (filter ? 'all' : category)}
            >
              {name}
            </ListLink>
          ))}
        </CategoryNav>
        <SearchBar>
          <IconSearch size="xs" />
          <input
            type="text"
            value={filter}
            placeholder={t('Filter Platforms')}
            onChange={e => {
              setFilter(e.target.value);
            }}
          />
        </SearchBar>
      </NavContainer>
      <PlatformList className={listClassName} {...listProps}>
        {platformList.map(platform => (
          <PlatformCard
            data-test-id={`platform-${platform.id}`}
            key={platform.id}
            platform={platform}
            selected={props.platforms.includes(platform.id)}
            onClear={(e: React.MouseEvent) => {
              removePlatform(platform.id);
              e.stopPropagation();
            }}
            onClick={() => {
              // do nothing if already selected
              if (props.platforms.includes(platform.id)) {
                return;
              }
              trackAdvancedAnalyticsEvent('growth.select_platform', {
                platform_id: platform.id,
                source,
                organization,
              });
              addPlatform(platform.id);
            }}
          />
        ))}
      </PlatformList>
      {platformList.length === 0 && (
        <EmptyMessage
          icon={<IconProject size="xl" />}
          title={t("We don't have an SDK for that yet!")}
        >
          {tct(
            `Not finding your platform? You can still create your project,
            but looks like we don't have an official SDK for your platform
            yet. However, there's a rich ecosystem of community supported
            SDKs (including Perl, CFML, Clojure, and ActionScript). Try
            [search:searching for Sentry clients] or contacting support.`,
            {
              search: (
                <ExternalLink href="https://github.com/search?q=-org%3Agetsentry+topic%3Asentry&type=Repositories" />
              ),
            }
          )}
        </EmptyMessage>
      )}
    </React.Fragment>
  );
}

const NavContainer = styled('div')`
  margin-bottom: ${space(2)};
  display: flex;
  flex-direction: row;
  align-items: start;
  border-bottom: 1px solid ${p => p.theme.border};
`;

const SearchBar = styled('div')`
  ${p => inputStyles(p)};
  padding: 0 8px;
  color: ${p => p.theme.subText};
  display: flex;
  align-items: center;
  font-size: 15px;
  margin-top: -${space(0.75)};

  input {
    border: none;
    background: none;
    padding: 2px 4px;
    width: 100%;
    /* Ensure a consistent line height to keep the input the desired height */
    line-height: 24px;

    &:focus {
      outline: none;
    }
  }

  max-width: 300px;
  min-width: 150px;
  margin-left: auto;
  flex-shrink: 0;
  flex-basis: 0;
  flex-grow: 1;
`;

const CategoryNav = styled(NavTabs)`
  margin: 0;
  margin-top: 4px;
  white-space: nowrap;
  overflow-x: scroll;
  overflow-y: hidden;
  margin-right: ${space(1)};
  flex-shrink: 1;
  flex-grow: 0;

  > li {
    float: none;
    display: inline-block;
  }
  ::-webkit-scrollbar {
    display: none;
  }
  -ms-overflow-style: none;
  scrollbar-width: none;
`;

const StyledPlatformIcon = styled(PlatformIcon)`
  margin: ${space(2)};
`;

const ClearButton = styled(Button)`
  position: absolute;
  top: -6px;
  right: -6px;
  min-height: 0;
  height: 22px;
  width: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: ${p => p.theme.background};
  color: ${p => p.theme.textColor};
`;

ClearButton.defaultProps = {
  icon: <IconClose isCircled size="xs" />,
  borderless: true,
  size: 'xsmall',
};

const PlatformCard = styled(({platform, selected, onClear, ...props}) => (
  <div {...props}>
    <StyledPlatformIcon
      platform={platform.id}
      size={56}
      radius={5}
      withLanguageIcon
      format="lg"
    />

    <h3>{platform.name}</h3>
    {selected && <ClearButton onClick={onClear} aria-label={t('Clear')} />}
  </div>
))`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 0 14px;
  border-radius: 4px;
  cursor: pointer;
  background: ${p => p.selected && p.theme.alert.info.backgroundLight};

  &:hover {
    background: ${p => p.theme.alert.muted.backgroundLight};
  }

  h3 {
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    color: ${p => (p.selected ? p.theme.textColor : p.theme.subText)};
    text-align: center;
    font-size: ${p => p.theme.fontSizeExtraSmall};
    text-transform: uppercase;
    margin: 0;
    padding: 0 ${space(0.5)};
    line-height: 1.2;
  }
`;

export default PlatformPicker;
