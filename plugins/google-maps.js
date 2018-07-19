import Vue from 'vue'
import * as VueGoogleMaps from 'vue2-google-maps'

Vue.use(VueGoogleMaps, {
  load: {
    key: 'AIzaSyAoKONb7HBoKkCrfZYBSsdOQ8cnEDTHTRQ',
    libraries: 'places'
  }
})
