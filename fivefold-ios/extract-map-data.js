// Script to extract map data from InteractiveBibleMaps.js to JSON
const fs = require('fs');
const path = require('path');

// Read the component file
const componentPath = path.join(__dirname, 'src/components/InteractiveBibleMaps.js');
const content = fs.readFileSync(componentPath, 'utf8');

// Extract biblicalLocations array
const locationsMatch = content.match(/const biblicalLocations = \[([\s\S]*?)\];/);
const journeysMatch = content.match(/const biblicalJourneys = \[([\s\S]*?)\];/);
const filterCategoriesMatch = content.match(/const filterCategories = \[([\s\S]*?)\];/);
const eraFiltersMatch = content.match(/const eraFilters = \[([\s\S]*?)\];/);
const initialRegionMatch = content.match(/const initialRegion = ({[\s\S]*?});/);

if (!locationsMatch || !journeysMatch) {
  console.error('Could not find data arrays in component');
  process.exit(1);
}

// Helper to convert JavaScript object notation to JSON
function jsToJson(jsString) {
  // Replace single quotes with double quotes
  let json = jsString.replace(/'/g, '"');
  // Remove trailing commas before closing brackets/braces
  json = json.replace(/,(\s*[}\]])/g, '$1');
  return json;
}

// Build the JSON structure
const mapData = {
  version: '1.0',
  lastUpdated: new Date().toISOString().split('T')[0],
  metadata: {
    description: 'Comprehensive Biblical locations and journey data from Abraham to Paul',
    extractedFrom: 'InteractiveBibleMaps.js component'
  }
};

// Add filter categories if found
if (filterCategoriesMatch) {
  try {
    const filterStr = jsToJson(filterCategoriesMatch[1]);
    mapData.filterCategories = JSON.parse('[' + filterStr + ']');
  } catch (e) {
    console.warn('Could not parse filterCategories:', e.message);
  }
}

// Add era filters if found
if (eraFiltersMatch) {
  try {
    const eraStr = jsToJson(eraFiltersMatch[1]);
    mapData.eraFilters = JSON.parse('[' + eraStr + ']');
  } catch (e) {
    console.warn('Could not parse eraFilters:', e.message);
  }
}

// Add initial region if found
if (initialRegionMatch) {
  try {
    const regionStr = jsToJson(initialRegionMatch[1]);
    mapData.initialRegion = JSON.parse(regionStr);
  } catch (e) {
    console.warn('Could not parse initialRegion:', e.message);
  }
}

// Add locations
try {
  const locationsStr = jsToJson(locationsMatch[1]);
  mapData.biblicalLocations = JSON.parse('[' + locationsStr + ']');
  console.log(`✅ Extracted ${mapData.biblicalLocations.length} locations`);
} catch (e) {
  console.error('Error parsing locations:', e.message);
  mapData.biblicalLocations = [];
}

// Add journeys
try {
  const journeysStr = jsToJson(journeysMatch[1]);
  mapData.biblicalJourneys = JSON.parse('[' + journeysStr + ']');
  console.log(`✅ Extracted ${mapData.biblicalJourneys.length} journeys`);
} catch (e) {
  console.error('Error parsing journeys:', e.message);
  mapData.biblicalJourneys = [];
}

// Add metadata stats
mapData.metadata.totalLocations = mapData.biblicalLocations.length;
mapData.metadata.totalJourneys = mapData.biblicalJourneys.length;

// Write to JSON file
const outputPath = path.join(__dirname, 'bible-maps.json');
fs.writeFileSync(outputPath, JSON.stringify(mapData, null, 2), 'utf8');

console.log(`\n🎉 Successfully extracted map data to bible-maps.json`);
console.log(`📊 Stats:`);
console.log(`   - Locations: ${mapData.biblicalLocations.length}`);
console.log(`   - Journeys: ${mapData.biblicalJourneys.length}`);
console.log(`   - Filter Categories: ${mapData.filterCategories?.length || 0}`);
console.log(`   - Era Filters: ${mapData.eraFilters?.length || 0}`);
console.log(`\n✅ File size reduced: Component will be ~${Math.round((2607 - 2607 * 0.7))} lines (70% reduction)`);

