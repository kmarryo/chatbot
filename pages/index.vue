<template>
  <div>
    <!-- Pseudo login screen (without validation) -->
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
              <!-- User Messages -->
              {{ message.author + ': ' }}{{ message.text }}
              <br>
              <!-- Responses from the ottonova bot -->
                {{ `${message.response.author}: ${message.response.text}` }}
                <!-- Result shown by ottonova bot as soon as user makes his decision -->
              <div v-if="message.result.text">
                {{ message.result.author + ': ' }} {{ message.result.text }}
              </div>
              <!-- DATE Widget -->
              <div v-if="showDate && commands.date.done === false">
                <button v-for="(weekDay, i) in weekDays" :key="i" @click="day = weekDay; commands.date.done = true; showResult(message, day)">{{ weekDay }}</button>
              </div>
              <!-- MAP Widget -->
              <div v-if="showMap">
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
              <!-- RATE Widget -->
              <div v-if="showRate && commands.rate.done === false">
                <div v-for="(star, s) in commands.rate.data" :key="s" @mouseover="star.hover = true; calcStar(star, s)" @mouseout="star.hover = false; calcStar(star, s)" @click="commands.rate.done = true; showResult(message, `${star.stars} Stars`)">
                  <i class="material-icons">
                    {{ star.style }}
                  </i>
                </div>
              </div>
              <!-- COMPLETE Widget -->
              <div v-if="showComplete">
                <button v-for="option in commands.complete.data" :key="option" @click="runComplete(option)">{{ option }}</button>
              </div>
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
    logout: false,
    showDate: false,
    showMap: false,
    showRate: false,
    showComplete: false,
    weekDays: [],
    day: '',
    commands: {
      date: {
        author: 'ottonova bot',
        type: 'date',
        message: 'When do you want to meet us?',
        data: '2018-01-01T14:32:33.921Z',
        done: false
      },
      map: {
        author: 'ottonova bot',
        type: 'map',
        message: 'Find us here:',
        data: {
          lat: 48.1482933,
          lng: 11.586628
        },
        done: false
      },
      rate: {
        author: 'ottonova bot',
        type: 'rate',
        starRated: {},
        message: 'Please rate your experience:',
        data: [
          { stars: '1', style: 'star_border', hover: false },
          { stars: '2', style: 'star_border', hover: false },
          { stars: '3', style: 'star_border', hover: false },
          { stars: '4', style: 'star_border', hover: false },
          { stars: '5', style: 'star_border', hover: false }
        ],
        done: false
      },
      complete: {
        type: 'complete',
        message: 'Do you really want to quit?',
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
        this.submitted &&
        !this.logout
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
      // Message obj. that gets sended to socket on emit
      let message = {
        text: this.message.trim(),
        author: this.$store.state.user.name,
        type: '',
        response: {
          text: '',
          author: 'ottonova bot'
        },
        result: {
          text: '',
          author: 'ottonova bot'
        }
      }
      // generate response from ottonova bot
      message.response.text = this.getBotMessage(message)

      // emit socket send-message event
      socket.emit('send-message', message)
      this.messages.push(message)
      this.message = ''
    },
    getBotMessage(message) {
      // Commands are indicated by putting an "/" in front of the word
      // Check if message text has an /
      if (message.text.includes('/')) {
        message.type = 'command'
        // Create array of command types (names)
        // to check if this command after the slash really exists
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
          // message from bot when widget has been run before
          if (this.commands[command].done) {
            return 'Sorry, you can only run this widget once.'
          } else {
            // execute command and send message from bot
            this.runCommand(command)
            return this.commands[command].message
          }
        }
      } else {
        // Message is no command so it´s just repeated from the bot
        return `Hey ${this.$store.state.user.name}, you said "${
          message.text
        }", right?`
      }
    },
    showResult(message, result) {
      // Sends a message from the bot with the chosen result
      message.result.text = `Your choice: ${result}`
    },
    runCommand(command) {
      if (this.commands[command].done) return
      else {
        if (command === 'date') this.getDate()
        if (command === 'map')  {
          this.showMap = true
          this.commands.map.done = true
          }
        if (command === 'rate') this.showRate = true
        if (command === 'complete') this.showComplete = true
      }
    },
    scrollToBottom() {
      if (this.loggedIn) {
        this.$nextTick(() => {
          this.$refs.messages.scrollTop = this.$refs.messages.scrollHeight
        })
      }
    },
    userLogin() {
      // save user data in local storage and log him in
      this.$store.commit('saveData')
      this.submitted = true
      this.logout = false
    },
    getDate() {
      const date = new Date()
      // Array with only week days
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
      if (!this.showDate) this.showDate = true
    },
    calcStar(star, s) {
      // s = index of Array
      // Slice Array depending on how many stars the user is hovering
      const starArr = this.commands.rate.data.slice(0, s + 1)
      for (let item in starArr) {
        if (star.hover) {
          starArr[item].style = 'star_rate'
        } else {
          starArr[item].style = 'star_border'
        }
      }
    },
    runComplete(option) {
      // If user clicks yes, he should be logged out and comes back to the login screen
      if (option === 'Yes') {
        this.logout = true
      } else {
        this.showComplete = false
        this.commands.complete.done = true
      }
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