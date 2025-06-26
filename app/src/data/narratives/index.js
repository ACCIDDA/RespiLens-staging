// Narrative Registry - Auto-discovers all narrative files
// This file exports metadata for all available narratives

import { narrativeContent as fluWinter2024 } from './flu-winter-2024-25-slides.js';
import { narrativeContent as exampleSimple } from './example-simple.js';
import { narrativeContent as rsvTrends2024 } from './rsv-trends-2024.js';

// Helper function to extract metadata from narrative content
const extractMetadata = (content, id) => {
  const parts = content.split('---');
  if (parts.length >= 3) {
    const frontmatterLines = parts[1].trim().split('\n');
    const metadata = {};
    frontmatterLines.forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        metadata[key.trim()] = valueParts.join(':').trim().replace(/"/g, '');
      }
    });

    // Extract slides for counting
    const slideContent = parts.slice(2).join('---');
    const slideCount = slideContent.split(/\n# /).filter(s => s.trim()).length;

    // Estimate read time (average 200 words per minute, ~100 words per slide)
    const estimatedReadTime = Math.max(2, Math.ceil(slideCount * 0.5));

    return {
      id,
      title: metadata.title || 'Untitled Narrative',
      description: metadata.abstract || metadata.description || 'No description available',
      author: metadata.authors || metadata.author || 'Unknown Author',
      date: metadata.date || new Date().toISOString().split('T')[0],
      tags: metadata.tags ? metadata.tags.split(',').map(tag => tag.trim()) : [],
      readTime: `${estimatedReadTime} min`,
      slideCount,
      featured: false // Default, can be overridden below
    };
  }
  return null;
};

// Registry of all available narratives
export const narrativeRegistry = [
  {
    ...extractMetadata(fluWinter2024, 'flu-winter-2024-25-slides'),
    featured: true, // Mark as featured
    tags: ['Influenza', 'Forecasting', 'Public Health', 'Winter 2024']
  },
  {
    ...extractMetadata(rsvTrends2024, 'rsv-trends-2024'),
    featured: true, // Also featured
    tags: ['RSV', 'Pediatric', 'Hospital Capacity', 'Healthcare']
  },
  {
    ...extractMetadata(exampleSimple, 'example-simple'),
    featured: false,
    tags: ['Example', 'Tutorial', 'Demo']
  }
].filter(Boolean); // Remove any null entries

// Helper to get narrative by ID
export const getNarrativeById = (id) => {
  return narrativeRegistry.find(narrative => narrative.id === id);
};

// Helper to get featured narratives
export const getFeaturedNarratives = () => {
  return narrativeRegistry.filter(narrative => narrative.featured);
};

// Helper to get regular (non-featured) narratives
export const getRegularNarratives = () => {
  return narrativeRegistry.filter(narrative => !narrative.featured);
};

// Helper to get all unique tags
export const getAllTags = () => {
  const allTags = new Set();
  narrativeRegistry.forEach(narrative => {
    narrative.tags.forEach(tag => allTags.add(tag));
  });
  return Array.from(allTags).sort();
};

// Helper to search narratives
export const searchNarratives = (searchTerm = '', filterTag = '', sortBy = 'date') => {
  let filtered = narrativeRegistry;

  // Apply search filter
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(narrative =>
      narrative.title.toLowerCase().includes(term) ||
      narrative.description.toLowerCase().includes(term) ||
      narrative.author.toLowerCase().includes(term) ||
      narrative.tags.some(tag => tag.toLowerCase().includes(term))
    );
  }

  // Apply tag filter
  if (filterTag) {
    filtered = filtered.filter(narrative => narrative.tags.includes(filterTag));
  }

  // Apply sorting
  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.date) - new Date(a.date);
      case 'title':
        return a.title.localeCompare(b.title);
      case 'author':
        return a.author.localeCompare(b.author);
      case 'readTime':
        return parseInt(a.readTime) - parseInt(b.readTime);
      default:
        return 0;
    }
  });

  return filtered;
};

export default narrativeRegistry;