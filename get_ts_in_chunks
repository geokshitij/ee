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
 *                  'NDVI', 'ndvi', 250, 0.0001, 'eeT', 'modis_ndvi_series');
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






// Function to get a subset of a FeatureCollection
function getSubset(collection, startIndex, endIndex) {
  return ee.FeatureCollection(collection.toList(endIndex, startIndex));
}

// Function to divide and export time series data for points in chunks
function divideAndExportTimeSeries(collection, numChunks, imageCollectionId, startDate, endDate, band, bandAlias, scale, multiplier, outputFolder) {
  var totalFeatures = collection.size();
  var chunkSize = totalFeatures.divide(numChunks).ceil(); // Dividing into chunks

  for (var i = 0; i < numChunks; i++) {
    var startIndex = ee.Number(i).multiply(chunkSize);
    var endIndex = startIndex.add(chunkSize);
    var subset = getSubset(collection, startIndex, endIndex);

    var fileNamePrefix = 'chunk' + (i + 1) + '_' + bandAlias;
    exportTimeSeries(imageCollectionId, subset, startDate, endDate, band, bandAlias, scale, multiplier, outputFolder, fileNamePrefix);
  }
}

// Load your points FeatureCollection
var points = ee.FeatureCollection("projects/kshitijgee/assets/toGEE_NepalS");

// Start and End Dates for ERA5 Data
var startDate = '1950-01-01';
var endDate = '2015-12-31';

// ERA5 Daily Meteorological Data Collection ID
var era5CollectionId = 'ECMWF/ERA5/DAILY';

// Specify the ERA5 band to export
var band = 'surface_pressure'; // Replace with the band you're interested in
var bandAlias = band;
var scale = 27830; // Adjust the scale as needed
var multiplier = 1; // Adjust the multiplier as needed
var outputFolder = 'eeT'; // Specify your output folder

// Call the function to divide and export ERA5 data
divideAndExportTimeSeries(points, 5, era5CollectionId, startDate, endDate, band, bandAlias, scale, multiplier, outputFolder);






