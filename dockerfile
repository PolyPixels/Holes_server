# ========================
# Step 1: Prepare client
# ========================
FROM node:20 AS client-builder

WORKDIR /client

# Clone the client repo
RUN git clone https://github.com/PolyPixels/Holes_Client.git .

# No npm install or build needed!
# It's pure static HTML/JS/CSS

# ========================
# Step 2: Prepare server
# ========================
FROM node:20 AS server-builder

WORKDIR /app

# Clone the server repo
RUN git clone https://github.com/PolyPixels/Holes_server.git .

# Install server dependencies
RUN npm install

# Create folder structure server expects
RUN mkdir -p Holes_Client
COPY --from=client-builder /client ../Holes_Client

# ========================
# Step 3: Final production image
# ========================
FROM node:20-slim

WORKDIR /app

COPY --from=server-builder /app .
COPY --from=server-builder /Holes_Client ../Holes_Client

EXPOSE 3000

ENV PORT=3000
ENV Welcome="Welcome to Holes!"

CMD ["node", "server.js"]

