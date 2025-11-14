// Test search logic
const testRoutes = [
  {
    id: '1',
    name: 'aaaa',
    fromLocation: 'BIT',
    toLocation: 'Mangalore',
    busNumber: 'AKMS',
    departureTime: '02:30:00',
    reachingTime: '04:00:00',
    stops: [
      { id: '1', name: 'deralakatte', location: { latitude: 0, longitude: 0 } },
      { id: '2', name: 'pumpwell', location: { latitude: 0, longitude: 0 } }
    ]
  },
  {
    id: '2',
    name: '51A',
    fromLocation: 'BIT',
    toLocation: 'MANGALAORE',
    busNumber: 'KA19-1234',
    departureTime: '08:00:00',
    reachingTime: '10:00:00',
    stops: [
      { id: '3', name: 'konaje', location: { latitude: 0, longitude: 0 } },
      { id: '4', name: 'deralakatte', location: { latitude: 0, longitude: 0 } }
    ]
  }
];

function performSearch(searchFrom, searchTo, routesToSearch) {
  const searchFromLower = searchFrom.toLowerCase().trim();
  const searchToLower = searchTo.toLowerCase().trim();
  
  console.log('=== SEARCH DEBUG ===');
  console.log('Searching for:', { from: searchFromLower, to: searchToLower });
  console.log('Total routes:', routesToSearch.length);
  
  const results = routesToSearch.filter(route => {
    const stops = route.stops || [];
    
    console.log(`\nChecking route: ${route.name}`);
    console.log('  From:', route.fromLocation);
    console.log('  To:', route.toLocation);
    console.log('  Stops:', stops.map(s => s.name).join(', '));
    
    const fromMatchesRouteStart = route.fromLocation?.toLowerCase().trim().includes(searchFromLower);
    const fromStopIndex = stops.findIndex(stop => 
      stop.name?.toLowerCase().trim().includes(searchFromLower)
    );
    const fromMatch = fromMatchesRouteStart || fromStopIndex !== -1;
    
    console.log('  From match:', { fromMatchesRouteStart, fromStopIndex, fromMatch });
    
    const toMatchesRouteEnd = route.toLocation?.toLowerCase().trim().includes(searchToLower);
    const toStopIndex = stops.findIndex(stop => 
      stop.name?.toLowerCase().trim().includes(searchToLower)
    );
    const toMatch = toMatchesRouteEnd || toStopIndex !== -1;
    
    console.log('  To match:', { toMatchesRouteEnd, toStopIndex, toMatch });
    
    if (!fromMatch || !toMatch) {
      console.log('  ❌ REJECTED: One or both don\'t match');
      return false;
    }
    
    if (fromStopIndex !== -1 && toStopIndex !== -1) {
      const valid = fromStopIndex < toStopIndex;
      console.log(`  Case 1: Both stops - ${valid ? '✅ VALID' : '❌ INVALID'} (order: ${fromStopIndex} < ${toStopIndex})`);
      return valid;
    }
    
    if (fromMatchesRouteStart && toStopIndex !== -1) {
      console.log('  Case 2: Start to stop - ✅ VALID');
      return true;
    }
    
    if (fromStopIndex !== -1 && toMatchesRouteEnd) {
      console.log('  Case 3: Stop to end - ✅ VALID');
      return true;
    }
    
    if (fromMatchesRouteStart && toMatchesRouteEnd) {
      console.log('  Case 4: Start to end - ✅ VALID');
      return true;
    }
    
    console.log('  Edge case - allowing match');
    return true;
  });

  console.log('\n=== SEARCH COMPLETE ===');
  console.log('Matched routes:', results.length);
  console.log('Routes:', results.map(r => r.name).join(', '));
  
  return results;
}

// Test 1: BIT to deralakatte
console.log('\n\n========== TEST 1: BIT to deralakatte ==========');
const result1 = performSearch('BIT', 'deralakatte', testRoutes);
console.log('\nExpected: 2 routes (aaaa and 51A)');
console.log('Actual:', result1.length, 'routes');

// Test 2: deralakatte to pumpwell
console.log('\n\n========== TEST 2: deralakatte to pumpwell ==========');
const result2 = performSearch('deralakatte', 'pumpwell', testRoutes);
console.log('\nExpected: 1 route (aaaa)');
console.log('Actual:', result2.length, 'routes');

// Test 3: BIT to Mangalore
console.log('\n\n========== TEST 3: BIT to Mangalore ==========');
const result3 = performSearch('BIT', 'Mangalore', testRoutes);
console.log('\nExpected: 1 route (aaaa)');
console.log('Actual:', result3.length, 'routes');
