import {io} from "socket.io-client";

const socket = io("https://draw-and-guess-server-production.up.railway.app/", {
  transports: ["websocket"]);
export default socket;
