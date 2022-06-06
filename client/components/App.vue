<template>
    
</template>

<script>
    export default {
        name: 'App',
        data: function() {
            return {
                connection: null
            }
        },
        methods: {
            onRegistered: function(arr) {
                console.log(arr)
            },
            onMessage: function(arr) {
                console.log(arr)
            },
            send: function(payload) {
                this.connection.send(JSON.stringify(payload))
            }
        },
        created: function() {
            console.log("Starting connection to WebSocket Server")
            this.connection = new WebSocket("ws://127.0.0.1:8080/");

            this.connection.onopen = function(event) {
                console.log(event)
                console.log("Successfully connected to the echo websocket server...")
                this.send(JSON.stringify({
                    type: "register",
                    data: {
                        name: "Rick",
                        id: "ur",
                        token: "mom"
                    } 
                }));
            }

            this.connection.onmessage = function(event) {
                
            }

        }
    }
</script>
