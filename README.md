![image](https://github.com/user-attachments/assets/735a3bfb-79dd-49ad-8934-5f13f893dd11)


Here’s an updated `README.md` file that includes the use of `express.static` to serve static files, along with other relevant details about the project:

---

# Holes Server

This repository contains the **Node.js server** for the game **Holes**. It facilitates real-time communication, serves static files for the client, and manages game data with a custom map generation system.

---

## Features

- **Real-time Communication:** Socket.io is used to enable real-time events between the client and server.
- **Static File Serving:** Serves the static files for the client from the `../Holes_client` directory.
- **Dynamic Map Generation:** Includes noise-based map generation for the game world.
- **Player Management:** Tracks and updates player positions and actions in real-time.

---

## Prerequisites

- **Node.js**: Ensure you have Node.js installed on your system.
- **npm**: Installed alongside Node.js.

---

## Installation

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/your-username/holes_server.git
   cd holes_server
   ```

2. **Install Dependencies:**

   ```bash
   npm install
   ```

3. **Directory Setup:**

   Ensure the `Holes_client` directory exists as a sibling to this server directory. For example:

   ```plaintext
   ../
   ├── Holes_client/   # Client-side files
   └── Holes_server/   # This server directory
   ```

4. **Start the Server:**

   ```bash
   node server.js
   ```

---

## Serving Static Files

The server is configured to serve static files from the `../Holes_client` directory. This allows the client-side game to be hosted directly from this Node.js server.

Relevant code snippet:

```javascript
// Serve static files
app.use(express.static('../Holes_client'));
```

Access the client files in your browser by navigating to `http://localhost:3000`.

---

## Socket Events

| Event Name      | Payload                  | Description                                 |
|-----------------|--------------------------|---------------------------------------------|
| `connection`    | `socket`                 | Triggered when a new client connects        |
| `new_player`    | `{id, position, ...}`    | Adds a new player to the game               |
| `update_pos`    | `{id, position}`         | Updates the position of a player            |
| `update_node`   | `{index, value}`         | Updates the map node                        |
| `disconnect`    |                          | Triggered when a client disconnects         |

---

## Map Generation

The server includes a noise-based map generation system. Each map is dynamically created using the `simplex-noise` library. Features include:

- Noise-based terrain generation.
- Room creation with boundary conditions.

---

## Configuration

- **Port**: The server listens on port `3000` by default. This can be modified in the `server.js` file.

---

## Development

- Use **nodemon** for automatic server reloads during development:

  ```bash
  npm install -g nodemon
  nodemon server.js
  ```

---

# ENVs
```
SERVER_LOGO
SERVER_NAME
```

## Troubleshooting

### CORS Errors
If you encounter **CORS errors**, ensure that the frontend and backend are configured properly. The server has been configured to allow requests from [`http://127.0.0.1:5500`](http://127.0.0.1:5500/game/index.html).



# basic Docker file 

```
docker pull polypikzel/holesgame
```

pull run and dig !
https://hub.docker.com/r/polypikzel/holesgame
---



