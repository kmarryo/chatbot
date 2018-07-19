<template>
  <div>
    <div v-if="chooseDate">
      <h3>Please choose your preferred date:</h3>
      <button v-for="(weekDay, i) in weekDays" :key="i" @click="day = weekDay; chooseDate = false">{{ weekDay }}</button>
    </div>
    <div v-if="showMap">
      <h3>Find your way to us:</h3>
      <no-ssr>
        <GmapMap :center="commands.map.data"
                   :zoom="15"
                   map-type-id="roadmap"
                   style="width: 650px; height: 400px">
          <GmapMarker :position="commands.map.data"
                      :clickable="true"
                      :draggable="true"
                      @click="center=commands.map.data" />
        </GmapMap>
      </no-ssr>
    </div>
    <div v-if="showRate">
      <h3>Please rate your experience:</h3>
      <div v-for="(star, s) in commands.rate.data" :key="s" @mouseover="commands.rate.data.slice(0, s).style = 'star_rate'">
        {{commands.rate.data.slice(0, s + 1)}}
        <i class="material-icons">
          {{ star.style }}
        </i>
      </div>
    </div>
    <form action="" @submit.prevent="userLogin" v-if="!loggedIn">
      <input type="text" placeholder="Username" v-model="$store.state.user.name">
      <input type="password" placeholder="Password" v-model="$store.state.user.pw">
      <button type="submit">Login</button>
    </form>
    <ul class="pages" v-else>
      <li class="chat page">
        <div class="chatArea">
          <ul class="messages" ref="messages">
            <li class="message" v-for="(message, index) in messages" :key="index">
              {{ $store.state.user.name + ': ' }}{{ message.text }} 
              <br> 
              {{ bot.author + ': ' }}
              {{ getBotMessage(message) }}
            </li>
          </ul>
        </div>
        <input class="inputMessage" type="text" v-model="message" @keyup.enter="sendMessage" placeholder="Type here..." />
      </li>
    </ul>
  </div>
</template>

<script>
import socket from '~/plugins/socket.io.js'

export default {
  data: () => ({
    submitted: false,
    chooseDate: false,
    showMap: false,
    showRate: false,
    starStyle: 'star_border',
    weekDays: [],
    day: '',
    bot: {
      author: 'ottonova bot',
      message: ''
    },
    commands: {
      date: {
        author: 'ottonova bot',
        type: 'date',
        data: '2018-01-01T14:32:33.921Z',
        done: false
      },
      map: {
        author: 'ottonova bot',
        type: 'map',
        data: {
          lat: 48.1482933,
          lng: 11.586628
        },
        done: false
      },
      rate: {
        author: 'ottonova bot',
        type: 'rate',
        data: [
          { stars: '1', style: 'star_border' },
          { stars: '2', style: 'star_border' },
          { stars: '3', style: 'star_border' },
          { stars: '4', style: 'star_border' },
          { stars: '5', style: 'star_border' }
        ],
        done: false
      },
      complete: {
        type: 'complete',
        data: ['Yes', 'No'],
        done: false
      }
    }
  }),
  computed: {
    loggedIn() {
      return (
        this.$store.state.user.name &&
        this.$store.state.user.pw &&
        this.submitted
      )
    }
  },
  asyncData(context, callback) {
    socket.emit('last-messages', function(messages) {
      callback(null, {
        messages,
        message: ''
      })
    })
  },
  watch: {
    messages: 'scrollToBottom'
  },
  beforeMount() {
    socket.on('new-message', message => {
      this.messages.push(message)
    })
  },
  mounted() {
    this.scrollToBottom()
  },
  methods: {
    sendMessage() {
      if (!this.message.trim()) return
      let message = {
        text: this.message.trim()
      }
      // Commands are indicated by putting an "/" in front of the word
      if (message.text.includes('/')) {
        // Create array of command types (names)
        let commandTypes = []
        for (command in this.commands) {
          commandTypes.push(this.commands[command].type)
        }
        // Get the text after the /
        let command = message.text
          .split('/')
          .splice(-1)[0]
          .split(' ')[0]

        // Check if the command exists
        if (commandTypes.indexOf(command) > -1) {
          this.runCommand(command)
        }
      }
      socket.emit('send-message', message)
      this.messages.push(message)
      this.message = ''
    },
    getBotMessage(msg) {
      return `Hey ${this.$store.state.user.name}, you said "${
        msg.text
      }", right?`
    },
    runCommand(command) {
      if (command === 'date' && !this.commands.date.done) this.getDate()
      if (command === 'map' && !this.commands.map.done) this.getMap()
      if (command === 'rate' && !this.commands.rate.done) this.getRate()
    },
    scrollToBottom() {
      if (this.loggedIn) {
        this.$nextTick(() => {
          this.$refs.messages.scrollTop = this.$refs.messages.scrollHeight
        })
      }
    },
    userLogin() {
      this.$store.commit('saveData')
      this.submitted = true
    },
    getDate() {
      const date = new Date()
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      let dayIndex = date.getDay() - 1
      // Current day
      const day = days[dayIndex]
      // Get week days by starting array from 0 after looping it to the end
      for (let i = 0; i < days.length; i++) {
        if (dayIndex >= days.length) dayIndex = 0
        this.weekDays.push(days[dayIndex])
        dayIndex++
      }
      console.log(this.chooseDate)
      if (!this.chooseDate) this.chooseDate = true
      // Prevents that the widget can be called again
      this.commands.date.done = true
    },
    getMap() {
      console.log('get map')
      this.showMap = true
      this.commands.map.done = true
    },
    getRate() {
      console.log('get rate')
      this.showRate = true
      this.commands.rate.done = true
    }
  },
  head: {
    title: 'ottonova socket.io chat'
  }
}
</script>

<style>
* {
  box-sizing: border-box;
}

html {
  font-weight: 300;
  -webkit-font-smoothing: antialiased;
}

html,
input {
  font-family: 'HelveticaNeue-Light', 'Helvetica Neue Light', 'Helvetica Neue',
    Helvetica, Arial, 'Lucida Grande', sans-serif;
}

html,
body {
  height: 100%;
  margin: 0;
  padding: 0;
}

ul {
  list-style: none;
  word-wrap: break-word;
}

/* Pages */

.pages {
  height: 100%;
  margin: 0;
  padding: 0;
  width: 100%;
}

.page {
  height: 100%;
  position: absolute;
  width: 100%;
}

/* Font */

.messages {
  font-size: 150%;
}

.inputMessage {
  font-size: 100%;
}

.log {
  color: gray;
  font-size: 70%;
  margin: 5px;
  text-align: center;
}

/* Messages */

.chatArea {
  height: 100%;
  padding-bottom: 60px;
}

.messages {
  height: 100%;
  margin: 0;
  overflow-y: scroll;
  padding: 10px 20px 10px 20px;
}

/* Input */

.inputMessage {
  border: 10px solid #3b8070;
  bottom: 0;
  height: 60px;
  left: 0;
  outline: none;
  padding-left: 10px;
  position: absolute;
  right: 0;
  width: 100%;
}
</style>