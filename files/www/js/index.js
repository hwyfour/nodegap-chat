/* A client receives:
 *
 * connect              A connection confirmation message
 * chatMessage          A regular chat message that we write to the screen
 * typingMessage        An alert that some client is writing a message
 * stopTypingMessage    An alert that some client stopped writing
 * clientJoin           An alert that some client joined the room
 * clientLeave          An alert that some client left the room
 * otherNickChange      An alert that some client changed its nickname
 *
 * A client sends:
 *
 * clientURL            The current URL of this client. This is the current room identifier
 * clientMessage        A chat message sent by this client
 * clientTyping         An alert that this client is typing
 * clientNotTyping      An alert that this client stopped typing
 * clientNick           A message with a new nickname that the server stores for this client
 *
 */

var socket = io.connect("216.19.181.111");
var output;
var userMsg;
var ctrl;
var writ;
var deviceName = "";
var currentlyTyping = false;    //flag to control when a "currently typing" message is emitted

/* This function runs after the DOM is ready to go.
 */
window.onload = function () {
    document.addEventListener("deviceready", onDeviceReady, false);
    output = document.getElementById("screen");
    userMsg = document.getElementById("userMsg");
    ctrl = document.getElementById("controls");
    writ = document.getElementById("write");
    //define the width of the window so the elements stretch the whole width of the screen
    ctrl.style.width = document.body.clientWidth - 20 + "px";
    writ.style.width = document.body.clientWidth - 20 + "px";
    
    //pads the top message down to right above the input box
    writ.style.paddingTop = document.body.clientHeight - 100 + "px";
    
    userMsg.addEventListener("keydown", userInput, false);
    userMsg.addEventListener("input", userTyping, false);
    window.addEventListener("orientationchange", changeOrientation);
};

/* This function runs when the device is ready.
 */
function onDeviceReady() {
    //deviceName = device.name;
    socket.emit('clientNick', {data: device.name});
}

/* When a client first connects, we send the current URL
 * back to the server to be used as the current chatroom.
 * We also update the status icon to show that we are connected.
 * All code up to and including the socket.emit was moved here from
 * window.onload to accomodate for timing issues where socket functions
 * were being called before the DOM had fully loaded.
 */
socket.on("connect", function () {
    socket.emit("clientURL", {data: document.URL});
});

/* When a client receives a message, we write it to the chat
 * panel and then scroll to the very bottom of the page to
 * keep the conversation focused on this last chat message.
 */
socket.on("chatMessage", function (data) {
    var infos = document.createElement("span");
    var msgs = document.createElement("span");
    infos.innerHTML = data.data.timeStamp + " " + data.data.nick;
    msgs.innerHTML = data.data.msg;
    var pre = document.createElement("p");
    pre.appendChild(infos);
    pre.appendChild(msgs);
    var red = document.createElement("div");
    red.className = "message";
    red.appendChild(pre);
    output.appendChild(red);

    //a fix to keep the page scrolled to the bottom
    window.scrollTo(0, document.getElementById("write").clientHeight + 5000);
});

/* When a different client starts typing, the server is alerted
 * which in turn alerts all other clients connected to the same
 * room. This alert is then written to the chat panel just like
 * a regular chat message. This function handles the alert we
 * received from the server.
 */
socket.on("typingMessage", function (data) {
    var pre = document.createElement("p");
    pre.innerHTML = data.nick + " is currently typing";
    var red = document.createElement("div");
    red.className = "alert yellow";
    red.id = data.nick;
    red.appendChild(pre);
    output.appendChild(red);

    //a fix to keep the page scrolled to the bottom
    window.scrollTo(0, document.getElementById("write").clientHeight + 5000);
});

/* Remove the message that shows that a different client is typing.
 * Generally, this is called when that client erases all of
 * their input or submits a message to the server. In either
 * case, there is no more typing happening, so we are alerted to this.
 */
socket.on("stopTypingMessage", function (data) {
    var pre = document.getElementById(data.nick);
    output.removeChild(pre);
});

/* When a client joins the room, we receive this message.
 * Just like a "currently typing" message, we write this to the chat panel.
 */
socket.on("clientJoin", function (data) {
    var pre = document.createElement("p");
    pre.innerHTML = data.nick + " has joined the room";
    var red = document.createElement("div");
    red.className = "alert green";
    red.appendChild(pre);
    output.appendChild(red);

    //a fix to keep the page scrolled to the bottom
    window.scrollTo(0, document.getElementById("write").clientHeight + 5000);
});

/* When a client leaves the room, we receive this message.
 * Just like a "currently typing" message, we write this to the chat panel.
 */
socket.on("clientLeave", function (data) {
    var pre = document.createElement("p");
    pre.innerHTML = data.nick + " has left the room";
    var red = document.createElement("div");
    red.className = "alert orange";
    red.appendChild(pre);
    output.appendChild(red);

    //a fix to keep the page scrolled to the bottom
    window.scrollTo(0, document.getElementById("write").clientHeight + 5000);
});

/* When a client changes their nickname, we receive this message.
 * Just like a "currently typing" message, we write this to the chat panel.
 */
socket.on("otherNickChange", function (data) {
    var pre = document.createElement("p");
    pre.innerHTML = data.old + " is now known as " + data.changed;
    var red = document.createElement("div");
    red.className = "alert blue";
    red.appendChild(pre);
    output.appendChild(red);

    //a fix to keep the page scrolled to the bottom
    window.scrollTo(0, document.getElementById("write").clientHeight + 5000);
});

/* When a user presses enter in the input box, we run this code.
 * If the input box isn't empty, we send the input to the server as a
 * message and then clear the input box.
 */
function userInput(event) {
    if (event.keyCode === 13) {
        //the enter key was pressed, submit the message
        var msg = userMsg.value.replace(/<\/?[^>]+(>|$)/g, "");
        if (msg !== "") {
            socket.emit("clientMessage", {data: msg});
            //clear the input for re-use
            userMsg.value = "";
            //because the message has been sent, the client is no longer typing.
            currentlyTyping = false;
            socket.emit("clientNotTyping", {data: 0});
        }
    }
}

/* When a user hits any key in the input box, this function is called.
 * If the box isn't empty, alert the server that the user is typing.
 * If the box is empty, the user is not typing anything anymore and
 * the server is alerted to this.
 */
function userTyping(event) {
    if (userMsg.value !== "") {
        if (!currentlyTyping) {
            currentlyTyping = true;
            socket.emit("clientTyping", {data: 0});
        }
    } else {
        currentlyTyping = false;
        socket.emit("clientNotTyping", {data: 0});
    }
}

/* When a user rotates the phone, this function gets called that then
 * reassigns a width to the elements on the page to keep them maximized.
 * The scroll code is to make sure when the orientation changes, the messages
 * are still right against the bottom of the page.
 */
function changeOrientation(event) {
    writ.style.width = document.body.clientWidth - 20 + "px";
    writ.style.paddingTop = document.body.clientHeight - 100 + "px";
    ctrl.style.width = document.body.clientWidth - 20 + "px";
    //a fix to keep the page scrolled to the bottom
    window.scrollTo(0, document.getElementById("write").clientHeight + 5000);
}