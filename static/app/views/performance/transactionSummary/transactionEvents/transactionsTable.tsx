import * as React from 'react';
import styled from '@emotion/styled';
import {Location, LocationDescriptor, Query} from 'history';

import GuideAnchor from 'app/components/assistant/guideAnchor';
import SortLink from 'app/components/gridEditable/sortLink';
import Link from 'app/components/links/link';
import LoadingIndicator from 'app/components/loadingIndicator';
import PanelTable from 'app/components/panels/panelTable';
import Tooltip from 'app/components/tooltip';
import {IconQuestion} from 'app/icons';
import {t} from 'app/locale';
import overflowEllipsis from 'app/styles/overflowEllipsis';
import space from 'app/styles/space';
import {Organization} from 'app/types';
import {TableData, TableDataRow} from 'app/utils/discover/discoverQuery';
import EventView, {MetaType} from 'app/utils/discover/eventView';
import {getFieldRenderer} from 'app/utils/discover/fieldRenderers';
import {Alignments, fieldAlignment, getAggregateAlias} from 'app/utils/discover/fields';
import CellAction, {Actions} from 'app/views/eventsV2/table/cellAction';
import {TableColumn} from 'app/views/eventsV2/table/types';
import {GridCell, GridCellNumber} from 'app/views/performance/styles';
import {TrendsDataEvents} from 'app/views/performance/trends/types';

type Props = {
  eventView: EventView;
  organization: Organization;
  location: Location;
  isLoading: boolean;
  tableData: TableData | TrendsDataEvents | null;
  columnOrder: TableColumn<React.ReactText>[];
  titles?: string[];
  generateLink?: Record<
    string,
    (
      organization: Organization,
      tableRow: TableDataRow,
      query: Query
    ) => LocationDescriptor
  >;
  handleCellAction?: (
    c: TableColumn<React.ReactText>
  ) => (a: Actions, v: React.ReactText) => void;
};

class TransactionsTable extends React.PureComponent<Props> {
  getTitles() {
    const {eventView, titles} = this.props;
    return titles ?? eventView.getFields();
  }

  renderHeader() {
    const {tableData, columnOrder} = this.props;

    const tableMeta = tableData?.meta;
    const generateSortLink = () => undefined;
    const tableTitles = this.getTitles();

    const headers = tableTitles.map((title, index) => {
      const column = columnOrder[index];
      const align: Alignments = fieldAlignment(column.name, column.type, tableMeta);

      if (column.key === 'span_ops_breakdown.relative') {
        return (
          <HeadCellContainer key={index}>
            <GuideAnchor target="span_op_relative_breakdowns">
              <SortLink
                align={align}
                title={
                  title === t('operation duration') ? (
                    <React.Fragment>
                      {title}
                      <Tooltip
                        title={t(
                          'Durations are calculated by summing span durations over the course of the transaction. Percentages are then calculated by dividing the individual op duration by the sum of total op durations. Overlapping/parallel spans are only counted once.'
                        )}
                      >
                        <StyledIconQuestion size="xs" color="gray400" />
                      </Tooltip>
                    </React.Fragment>
                  ) : (
                    title
                  )
                }
                direction={undefined}
                canSort={false}
                generateSortLink={generateSortLink}
              />
            </GuideAnchor>
          </HeadCellContainer>
        );
      }

      return (
        <HeadCellContainer key={index}>
          <SortLink
            align={align}
            title={title}
            direction={undefined}
            canSort={false}
            generateSortLink={generateSortLink}
          />
        </HeadCellContainer>
      );
    });

    return headers;
  }

  renderRow(
    row: TableDataRow,
    rowIndex: number,
    columnOrder: TableColumn<React.ReactText>[],
    tableMeta: MetaType
  ): React.ReactNode[] {
    const {
      eventView,
      organization,
      location,
      generateLink,
      handleCellAction,
      titles,
    } = this.props;
    const fields = eventView.getFields();

    if (titles && titles.length) {
      // Slice to match length of given titles
      columnOrder = columnOrder.slice(0, titles.length);
    }

    const resultsRow = columnOrder.map((column, index) => {
      const field = String(column.key);
      // TODO add a better abstraction for this in fieldRenderers.
      const fieldName = getAggregateAlias(field);
      const fieldType = tableMeta[fieldName];

      const fieldRenderer = getFieldRenderer(field, tableMeta);
      let rendered = fieldRenderer(row, {organization, location});

      const target = generateLink?.[field]?.(organization, row, location.query);

      if (target) {
        rendered = (
          <Link data-test-id={`view-${fields[index]}`} to={target}>
            {rendered}
          </Link>
        );
      }

      const isNumeric = ['integer', 'number', 'duration'].includes(fieldType);
      const key = `${rowIndex}:${column.key}:${index}`;
      rendered = isNumeric ? (
        <GridCellNumber>{rendered}</GridCellNumber>
      ) : (
        <GridCell>{rendered}</GridCell>
      );

      if (handleCellAction) {
        rendered = (
          <CellAction
            column={column}
            dataRow={row}
            handleCellAction={handleCellAction(column)}
          >
            {rendered}
          </CellAction>
        );
      }

      return <BodyCellContainer key={key}>{rendered}</BodyCellContainer>;
    });

    return resultsRow;
  }

  renderResults() {
    const {isLoading, tableData, columnOrder} = this.props;
    let cells: React.ReactNode[] = [];

    if (isLoading) {
      return cells;
    }
    if (!tableData || !tableData.meta || !tableData.data) {
      return cells;
    }

    tableData.data.forEach((row, i: number) => {
      // Another check to appease tsc
      if (!tableData.meta) {
        return;
      }
      cells = cells.concat(this.renderRow(row, i, columnOrder, tableData.meta));
    });
    return cells;
  }

  render() {
    const {isLoading, tableData} = this.props;

    const hasResults =
      tableData && tableData.data && tableData.meta && tableData.data.length > 0;

    // Custom set the height so we don't have layout shift when results are loaded.
    const loader = <LoadingIndicator style={{margin: '70px auto'}} />;

    return (
      <PanelTable
        isEmpty={!hasResults}
        emptyMessage={t('No transactions found')}
        headers={this.renderHeader()}
        isLoading={isLoading}
        disablePadding
        loader={loader}
      >
        {this.renderResults()}
      </PanelTable>
    );
  }
}

const HeadCellContainer = styled('div')`
  padding: ${space(2)};
`;

const BodyCellContainer = styled('div')`
  padding: ${space(1)} ${space(2)};
  ${overflowEllipsis};
`;

const StyledIconQuestion = styled(IconQuestion)`
  position: relative;
  top: 2px;
  left: 4px;
`;

export default TransactionsTable;
