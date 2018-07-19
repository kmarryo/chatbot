import Vuex from 'vuex'

const store = new Vuex.Store({
  state: {
    user: {
      name: '',
      pw: ''
    }
  },
  mutations: {
    saveData(state) {
      for (let entry in state.user) {
        localStorage.setItem(entry, JSON.stringify(state.user[entry]))
      }
    }
  }
})

const createStore = () => {
  return store
}

export default createStore
