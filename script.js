document.addEventListener('DOMContentLoaded', function() {
      // Initialize variables
      let foursquareApiKey = localStorage.getItem('foursquareApiKey');
      const apiKeyModal = document.getElementById('apiKeyModal');
      const apiKeyInput = document.getElementById('apiKeyInput');
      const saveApiKeyButton = document.getElementById('saveApiKeyButton');
      const locationInput = document.getElementById('locationInput');
      const categorySelect = document.getElementById('categorySelect');
      const limitInput = document.getElementById('limitInput');
      const searchButton = document.getElementById('searchButton');
      const resultsContainer = document.getElementById('resultsContainer');
      const errorContainer = document.getElementById('errorContainer');
      const mapContainer = document.getElementById('mapContainer');
      const mapClose = document.getElementById('mapClose');
      const settingsButton = document.getElementById('settingsButton');
      
      // Show API key modal if no key is stored
      if (!foursquareApiKey) {
        apiKeyModal.style.display = 'flex';
      }

      // Prefill input with saved value if it exists
      if (foursquareApiKey) apiKeyInput.value = foursquareApiKey;
      
      // Save API key to localStorage
      saveApiKeyButton.addEventListener('click', function() {
        foursquareApiKey = apiKeyInput.value.trim();
        
        if (foursquareApiKey) {
          localStorage.setItem('foursquareApiKey', foursquareApiKey);
          apiKeyModal.style.display = 'none';
        } else {
          alert('Please enter a valid Foursquare API key');
        }
      });

      // Settings button to open API key modal
      settingsButton.addEventListener('click', function() {
        apiKeyModal.style.display = 'flex';
      });
      
      // Fetch places from Foursquare API
      async function fetchPlaces(location, category, limit) {
        resultsContainer.innerHTML = '<div class="loading">Searching for places...</div>';
        errorContainer.innerHTML = '';
        
        let endpoint = `https://api.foursquare.com/v3/places/search?near=${encodeURIComponent(location)}&limit=${limit}`;
        
        if (category) {
          endpoint += `&categories=${category}`;
        }
        
        try {
          const response = await fetch(endpoint, {
            headers: {
              'Authorization': foursquareApiKey,
              'Accept': 'application/json'
            }
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch places');
          }
          
          return data.results || [];
        } catch (error) {
          errorContainer.innerHTML = `
            <div class="error">
              <strong>Error:</strong> ${error.message}
              ${error.message.includes('authorization') ? 
                '<p>Your API key may be invalid. Please refresh the page and enter a new key.</p>' : ''}
            </div>
          `;
          resultsContainer.innerHTML = '';
          return [];
        }
      }
      
      // Display places in UI
      function displayPlaces(places) {
        if (places.length === 0) {
          resultsContainer.innerHTML = '<div class="loading">No places found. Try a different location or category.</div>';
          return;
        }
        
        resultsContainer.innerHTML = places.map(place => {
          const address = place.location?.formatted_address || place.location?.address || 'Address not available';
          const categories = place.categories?.map(cat => cat.name).join(', ') || 'Category not available';
          const lat = place.geocodes?.main?.latitude;
          const lng = place.geocodes?.main?.longitude;
          
          return `
            <div class="place-card" data-lat="${lat}" data-lng="${lng}" data-name="${place.name}">
              <div class="place-image">
                ${place.categories && place.categories[0]?.icon ? 
                  `<img src="${place.categories[0].icon.prefix}88${place.categories[0].icon.suffix}" alt="${categories}">` :
                  'No Image Available'
                }
              </div>
              <div class="place-details">
                <div class="place-name">${place.name}</div>
                <div class="place-category">${categories}</div>
                <div class="place-address">${address}</div>
                <div class="place-buttons">
                  <button class="view-map">View on Map</button>
                </div>
              </div>
            </div>
          `;
        }).join('');
        
        // Add event listeners to map buttons
        document.querySelectorAll('.view-map').forEach(button => {
          button.addEventListener('click', function() {
            const card = this.closest('.place-card');
            const lat = card.dataset.lat;
            const lng = card.dataset.lng;
            const name = card.dataset.name;
            
            if (lat && lng) {
              showMap(lat, lng, name);
            } else {
              alert('Map coordinates not available for this location');
            }
          });
        });
      }
      
      // Function to show map using OpenStreetMap with Leaflet
      let map;
      let marker;
      
      function showMap(lat, lng, name) {
        mapContainer.style.display = 'flex';
        
        // If the map doesn't exist yet, create it
        if (!map) {
          map = L.map('map').setView([lat, lng], 15);
          
          // Add OpenStreetMap tile layer
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
          }).addTo(map);
          
          // Add control for fullscreen option
          L.control.zoom({
            position: 'topleft'
          }).addTo(map);
        } else {
          // If map already exists, just update the view
          map.setView([lat, lng], 15);
        }
        
        // Remove existing marker if any
        if (marker) map.removeLayer(marker);
        
        // Add new marker
        marker = L.marker([lat, lng]).addTo(map)
          .bindPopup(`<strong>${name}</strong>`)
          .openPopup();
          
        // Fix for map not displaying correctly in hidden container
        setTimeout(function() {
          map.invalidateSize();
        }, 100);
      }
      
      // Close map
      mapClose.addEventListener('click', function() {
        mapContainer.style.display = 'none';
      });
      
      // Search button click handler
      searchButton.addEventListener('click', async function() {
        const location = locationInput.value.trim();
        const category = categorySelect.value;
        const limit = limitInput.value || 9;
        
        if (!location) {
          alert('Please enter a location');
          return;
        }
        
        if (!foursquareApiKey) {
          apiKeyModal.style.display = 'flex';
          return;
        }
        
        const places = await fetchPlaces(location, category, limit);
        displayPlaces(places);
      });
      
      // Allow pressing Enter in the location input to trigger search
      locationInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          searchButton.click();
        }
      });
    });
