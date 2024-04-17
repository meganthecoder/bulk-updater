import fs from 'fs';
import { selectAll } from 'unist-util-select';
import { BulkUpdate, ExcelReporter, saveDocument } from '../bulk-update/index.js';
import { selectBlock } from '../bulk-update/migration-tools/select.js';

const DRY_RUN = true; // do not save documents
const PRIMARY_PRODUCT_NAME = 'primaryProductName';

const { pathname } = new URL('.', import.meta.url);
const dateString = ExcelReporter.getDateString();
const config = {
  // list: [
  //   '/customer-success-stories/query-index.json',
  //   '/resources/query-index.json',
  // ],
  list: [
    '/customer-success-stories/aaa-northeast-case-study',
    '/customer-success-stories/abb-case-study',
  ],
  siteUrl: 'https://main--bacom--adobecom.hlx.live',
  reporter: new ExcelReporter(`${pathname}reports/ppn-migration-${dateString}.xlsx`, true),
  outputDir: `${pathname}output`,
  mdDir: `${pathname}md`,
  mdCacheMs: 30 * 24 * 60 * 60 * 1000, // 30 days
  fetchWaitMs: 20,
};

function updatePPN(metadataBlock, entry) {
  console.log(`updatePPN ${entry}`);

  const rows = selectAll('gtRow', metadataBlock);
  rows.forEach((row) => {
    const text = selectAll('text', row);
    let hasPPN = false;

    text.forEach((textNode) => {
      if (textNode.value === PRIMARY_PRODUCT_NAME) {
        hasPPN = true;
        return;
      }

      if (hasPPN) {
        const { currentPPN, newPPN } = config.mapping.find((map) => map.path === entry);
        if (currentPPN !== textNode.value) {
          config.reporter.log('ppn migration', 'warn', 'Current PPN from md does not match csv.', { entry, mdPPN: textNode.value, csvPPN: currentPPN });
        }
        if (newPPN === 'REMOVE') {
          textNode.value = '';
          config.reporter.log('ppn migration', 'success', 'PPN Removed.', { entry });
          return;
        }
        if (newPPN) {
          textNode.value = newPPN;
          config.reporter.log('ppn migration', 'success', 'PPN Updated.', { entry, newPPN });
        }
      }
    });
  });
  // console.log(JSON.stringify(metadataBlock, null, 2));
}

function csvToArray(file) {
  if (!file) return [];
  const csv = fs.readFileSync(file, 'utf8').trim();
  const rows = csv.split(/\r?\n/);
  const headers = rows[0].split(',');
  rows.shift();

  const arr = rows.map((row) => {
    const rowData = row.split(',');
    const obj = {};
    headers.forEach((header, index) => {
      const data = rowData[index];
      obj[header] = data || '';
    });
    return obj;
  });

  return arr;
}

/**
 * @param {Object} document - The document to be migrated.
 * @param {string} document.entry - The entry path of the document.
 * @param {Object} document.mdast - The Markdown AST of the document.
 */
export async function migrate(document) {
  const { mdast, entry } = document;
  const metadata = selectBlock(mdast, 'Metadata');

  if (!metadata) {
    config.reporter.log('ppn migration', 'skip', 'No metadata block', { entry });
    return false;
  }

  updatePPN(metadata, entry);

  if (DRY_RUN) {
    config.reporter.log('save', 'skip', 'DRY RUN', { entry });
    return false;
  }

  await saveDocument(document, config);
  return true;
}

/**
 * Run using `npm run bulk-update 'migration-example'`
 *
 * @returns {Object} - The configuration object for the migration.
 */
export function init() {
  config.mapping = csvToArray(`${pathname}ppn-mapping.csv`);
  // const pathsToMigrate = config.mapping.map((item) => item[PATH]);

  // if (pathsToMigrate.length) config.list = pathsToMigrate;

  return config;
}

/**
 * Run using `node ppn/migration.js`
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('ppn migration');

  await BulkUpdate(init(), migrate);
  process.exit();
}
