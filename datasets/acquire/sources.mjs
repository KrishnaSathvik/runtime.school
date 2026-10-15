/**
 * Pinned upstream files for the real-source datasets. `living` sources are republished in place
 * by their publisher; their committed extracts (datasets/<id>/extract) are the reproducibility
 * anchor, and a hash change only means the upstream file was refreshed.
 */
export const SOURCES = {
  'online-retail-ii.zip': { url: 'https://archive.ics.uci.edu/static/public/502/online+retail+ii.zip', sha256: '572e36277c2390fbfde10664750731e0a86f55e33470d91919085f0408e67bfb' },
  'bts-2025-1.zip': { url: 'https://transtats.bts.gov/PREZIP/On_Time_Reporting_Carrier_On_Time_Performance_1987_present_2025_1.zip', sha256: '868387dcedaef1b8d8392e608e642219fde50d594c3cf2094aec858167629ccf' },
  'bts-2025-2.zip': { url: 'https://transtats.bts.gov/PREZIP/On_Time_Reporting_Carrier_On_Time_Performance_1987_present_2025_2.zip', sha256: '12dc8dbdb3c8b3c20d4c00a8b188196ae202f781a8760871ae502a9c733d0ecd' },
  'bts-2025-3.zip': { url: 'https://transtats.bts.gov/PREZIP/On_Time_Reporting_Carrier_On_Time_Performance_1987_present_2025_3.zip', sha256: '9c80fbc2112cdbf3f0613ec2001ba019b3ad75511cd69657080736e7eda9cef4' },
  'ourairports-airports.csv': { url: 'https://davidmegginson.github.io/ourairports-data/airports.csv', sha256: '536d6de0dfeed92d4bbe8fd7411ba6bc14c43251c2161f34b9fbfd50ee3f4113', living: true },
  'yellow_tripdata_2025-01.parquet': { url: 'https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2025-01.parquet', sha256: '9af277e4c0d3f9deb30644da822981e1e7df6af58313170fd3aa8a474485488a' },
  'yellow_tripdata_2025-02.parquet': { url: 'https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2025-02.parquet', sha256: '037cba555a73663f3a51a2c27816e40e3feb364769942bdf122b9da31e377bd3' },
  'yellow_tripdata_2025-03.parquet': { url: 'https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2025-03.parquet', sha256: '20c4b77cce457b7cfdae77c5069ca7dc91c167f876a41467f4502ab69487a186' },
  'taxi_zone_lookup.csv': { url: 'https://d37ci6vzurychx.cloudfront.net/misc/taxi_zone_lookup.csv', sha256: '1a99e105092230f8620f301edcca7f80d3080642ff404d28ed957d3fa222c8ed' },
  'EIA930_BALANCE_2024_Jan_Jun.csv': { url: 'https://www.eia.gov/electricity/gridmonitor/sixMonthFiles/EIA930_BALANCE_2024_Jan_Jun.csv', sha256: '26768c495c3ba987e29d79df2e40d4e741f9dbcff086f53c12ff774465756a10', living: true },
  'EIA930_INTERCHANGE_2024_Jan_Jun.csv': { url: 'https://www.eia.gov/electricity/gridmonitor/sixMonthFiles/EIA930_INTERCHANGE_2024_Jan_Jun.csv', sha256: '990b1994234922a06eb1f9ce55503db402ab916af8455e2dfbb020155f12681d', living: true },
  'EIA930_Reference_Tables.xlsx': { url: 'https://www.eia.gov/electricity/930-content/EIA930_Reference_Tables.xlsx', sha256: '9e191eae9c4f5c442e23d604140bbe8688a843dcbb37a2c97e7486c90d7c1cae', living: true },
  'retrosheet-2025csvs.zip': { url: 'https://www.retrosheet.org/downloads/2025/2025csvs.zip', sha256: '3d1e0e81d5913a635ae7a80366b811b777b832b488274124b4e38e04dd892753', living: true },
  'retrosheet-gameinfo.zip': { url: 'https://retrosheet.org/downloads/gameinfo.zip', sha256: '62bd2b664f458a04a0705c18ceb48483dcd8384f5d3bcbd055f3823d7fb14284', living: true },
  'retrosheet-biodata.zip': { url: 'https://www.retrosheet.org/downloads/biodata.zip', sha256: 'b389f4616dff02c45676519db6c46b7319e9dbc5be139e5ff31ca5b885f064c1', living: true },
  'ghcnd-stations.txt': { url: 'https://www.ncei.noaa.gov/pub/data/ghcn/daily/ghcnd-stations.txt', sha256: '428eabc955883187935bce283766d5646e3ed7484b92eb0803874c0e8dd9b342', living: true },
  'ghcnd-inventory.txt': { url: 'https://www.ncei.noaa.gov/pub/data/ghcn/daily/ghcnd-inventory.txt', sha256: 'c33ec006c4f35d0371e6f9ccfe3f656ae9de0b6f0f122794da07df7c971c48b5', living: true },
  'gaz-places.zip': { url: 'https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2023_Gazetteer/2023_Gaz_place_national.zip', sha256: '3c8b23c0dcdb15c0ebd16fee7373e032466e6b585650aa219bc1bee5ac8bd58f' },
};

export const DATASET_SOURCES = {
  retail: ['online-retail-ii.zip'],
  flights: ['bts-2025-1.zip', 'bts-2025-2.zip', 'bts-2025-3.zip', 'ourairports-airports.csv'],
  mobility: ['yellow_tripdata_2025-01.parquet', 'yellow_tripdata_2025-02.parquet', 'yellow_tripdata_2025-03.parquet', 'taxi_zone_lookup.csv'],
  energy: ['EIA930_BALANCE_2024_Jan_Jun.csv', 'EIA930_INTERCHANGE_2024_Jan_Jun.csv', 'EIA930_Reference_Tables.xlsx'],
  sports: ['retrosheet-2025csvs.zip', 'retrosheet-gameinfo.zip', 'retrosheet-biodata.zip'],
  weather: ['ghcnd-stations.txt', 'ghcnd-inventory.txt', 'gaz-places.zip'],
};
