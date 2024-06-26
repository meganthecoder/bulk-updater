import fs from 'fs';
import { expect } from '@esm-bundle/chai';
import { validateCardMetadata, getCardMetadata, createCardMetadataBlock } from '../../blog-caas/migration.js';
import { getMdast } from '../../bulk-update/document-manager/document-manager.js';
import { selectBlock } from '../../bulk-update/migration-tools/select.js';

const { pathname } = new URL('.', import.meta.url);

describe('Blog CAAS Migration', () => {
  let validCardMetadata;

  beforeEach(() => {
    validCardMetadata = {
      Title: 'Title',
      CardDescription: 'Description',
      CardImage: {
        alt: 'Image card image',
        label: 'image0',
        type: 'image',
        url: 'https://business.adobe.com/media.png',
      },
      CardImageAltText: 'Image card image',
      PrimaryTag: 'caas:content-type/blog',
      CardDate: '2024-02-27',
      Tags: [
        'caas:content-type/blog',
        'caas:cta/read-article',
        'caas:business-unit/creative-cloud',
      ],
    };
  });

  describe('validateCardMetadata', () => {
    it('returns true for valid metadata', () => {
      const metadata = { ...validCardMetadata };
      const result = validateCardMetadata(metadata);
      expect(result).to.be.true;
    });

    it('returns false for missing metadata', () => {
      const metadata = { ...validCardMetadata };

      delete metadata.Title;
      const result = validateCardMetadata(metadata);
      expect(result).to.be.false;
    });
  });

  describe('getCardMetadata', () => {
    const md = fs.readFileSync(`${pathname}mock/blog-caas.md`, 'utf-8');
    const mdast = getMdast(md);

    it('returns the correct metadata from mdast', () => {
      const result = getCardMetadata(mdast, '/blog/blog-caas');
      expect(result).to.deep.equal(validCardMetadata);
    });

    it('adds the news caas tags for latest pages', () => {
      const result = getCardMetadata(mdast, '/blog/the-latest/blog-caas');
      expect(result.Tags).to.include('caas:topic/news');
    });

    it('adds the news caas tags for international latest pages', () => {
      const result = getCardMetadata(mdast, '/de/blog/the-latest/blog-caas');
      expect(result.Tags).to.include('caas:topic/news');
    });

    it('adds the trends caas tags for perspectives pages', () => {
      const result = getCardMetadata(mdast, '/blog/perspectives/blog-caas');
      expect(result.Tags).to.include('caas:topic/trends');
    });

    it('adds the trends caas tags for international perspectives pages', () => {
      const result = getCardMetadata(mdast, '/fr/blog/perspectives/blog-caas');
      expect(result.Tags).to.include('caas:topic/trends');
    });
  });

  describe('createCardMetadataBlock', () => {
    it('returns a card metadata block with the correct values', () => {
      const result = createCardMetadataBlock(validCardMetadata);

      const expectedMd = fs.readFileSync(`${pathname}mock/card-metadata-expected.md`, 'utf-8');
      const expectedMdast = getMdast(expectedMd);
      const expectedBlock = selectBlock(expectedMdast, 'card-metadata');
      expect(result).to.not.be.null;
      expect(result).to.deep.equal(expectedBlock);
    });
  });
});
