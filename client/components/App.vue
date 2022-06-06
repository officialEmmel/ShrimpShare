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

        },
        created: function() {
            console.log("Starting connection to WebSocket Server")

            this.connection = new WebSocket("ws://127.0.0.1:8080/");

            this.connection.onopen = function(event) {
                console.log(event)
                console.log("Successfully connected to the echo websocket server...")
                this.send(JSON.stringify({
                    type: "register",
                    name: "Rick",
                    id: "ur",
                    token: "mom"
                }));
            }

            this.connection.onmessage = function(event) {
                let message = JSON.parse(event.data)
                onMessage(message, this)
            }
        }

    }


    function onRegistered(arr) {
        console.log(arr)
    }

    function onMessage(message, socket) {
        switch(message.type) {
            case "registered":
                onRegistered(message.data)
                break;
            case "member-update":
                onMessage(message)
                break;
            case "ping":
                socket.send(JSON.stringify({
                    type: "pong",
                    ping_id: message.id,
                    token: "mom",
                }))
                console.log("pong!")
                break;
            default:
                console.log("Unknown message type: " + message.type)
        }
    }
        
</script>
