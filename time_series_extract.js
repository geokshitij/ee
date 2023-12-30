/**
 * Universal Time Series Data Export Function for Google Earth Engine
 * 
 * This function, exportTimeSeries, is designed to extract and export time series data from any specified 
 * Earth Engine Image Collection to a CSV file. The function is flexible and allows for the selection of 
 * different image collections, feature collections, time ranges, bands, and scaling factors. 
 * It is particularly useful for remote sensing applications and spatial data analysis.
 *
 * Parameters:
 * - imageCollectionId: ID of the Image Collection to process (e.g., "MODIS/006/MOD13Q1").
 * - featureCollectionId: ID of the Feature Collection representing the points of interest.
 * - startDate: Start date for the time series data extraction (format: "YYYY-MM-DD").
 * - endDate: End date for the time series data extraction (format: "YYYY-MM-DD").
 * - band: Name of the band to be extracted from the images.
 * - bandAlias: Alias for the band (used in the output file).
 * - scale: Scale in meters for the extraction.
 * - multiplier: Factor to multiply the band values (for scaling purposes).
 * - outputFolder: Name of the Google Drive folder where the output file will be saved.
 * - fileNamePrefix: Prefix for the output file name.
 *
 * Example usage:
 * exportTimeSeries("MODIS/006/MOD13Q1", "users/Landuse-Landcover/points", '2010-01-01', '2011-01-01',
 *                  'NDVI', 'ndvi', 250, 0.0001, 'earthengine', 'modis_ndvi_series');
 */

// Function to export time series data for a given image collection, feature collection, and band
function exportTimeSeries(imageCollectionId, featureCollectionId, startDate, endDate, band, bandAlias, scale, multiplier, outputFolder, fileNamePrefix) {
  var imageCollection = ee.ImageCollection(imageCollectionId);
  var featureCollection = ee.FeatureCollection(featureCollectionId);
  var filtered = imageCollection.filterDate(startDate, endDate).select(band);

  var scaledBand = filtered.map(function(image) {
    return image.multiply(multiplier)
      .copyProperties(image, ['system:time_start', 'system:time_end']);
  });

  var triplets = scaledBand.map(function(image) {
    return image.reduceRegions({
      collection: featureCollection,
      reducer: ee.Reducer.mean().setOutputs([bandAlias]),
      scale: scale
    }).map(function(feature) {
      return feature.set('imageId', image.id());
    });
  }).flatten();

  var timeSeriesResults = formatTable(triplets, 'id', 'imageId', bandAlias);
  print(timeSeriesResults.first());

  Export.table.toDrive({
    collection: timeSeriesResults,
    description: fileNamePrefix,
    folder: outputFolder,
    fileNamePrefix: fileNamePrefix,
    fileFormat: 'CSV'
  });
}

// The format function modified to use the band alias
function formatTable(table, rowId, colId, bandAlias) {
  var rows = table.distinct(rowId);
  var joined = ee.Join.saveAll('matches').apply({
    primary: rows, 
    secondary: table, 
    condition: ee.Filter.equals({
      leftField: rowId, 
      rightField: rowId
    })
  });

  return joined.map(function(row) {
    var values = ee.List(row.get('matches'))
      .map(function(feature) {
        feature = ee.Feature(feature);
        var value = ee.List([feature.get(bandAlias), -9999])
          .reduce(ee.Reducer.firstNonNull());
        return [feature.get(colId), ee.Number(value).format('%.2f')];
      });
    return row.select([rowId]).set(ee.Dictionary(values.flatten()));
  });
}

// Example usage
exportTimeSeries(
  "MODIS/006/MOD13Q1",            // Image Collection ID
  "users/Landuse-Landcover/points",// Feature Collection ID
  '2010-01-01',                   // Start Date
  '2011-01-01',                   // End Date
  'NDVI',                         // Band to export
  'ndvi',                         // Band Alias (also used as the property name)
  250,                            // Scale in meters
  0.0001,                         // Multiplier for band value scaling
  'earthengine',                  // Output folder in Google Drive
  'modis_ndvi_series'             // File name prefix
);
