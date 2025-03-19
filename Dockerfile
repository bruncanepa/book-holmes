# Use an official Node.js runtime as the base image
FROM node:18

# Install required dependencies for Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy the entire monorepo but apps/web
COPY . /app
RUN rm -rf apps/web

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install
RUN cd apps/processor && pnpm install
RUN cd ../..

# Run the build command from root package.json
RUN pnpm run build

# Create a non-root user
RUN groupadd -r bruno && useradd -r -g bruno -G audio,video bruno \
    && chown -R bruno:bruno /home/bruno \
    && chown -R bruno:bruno /app

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production 

# Switch to non-root user
USER bruno

# Expose port (Heroku will set PORT env variable)
EXPOSE ${PORT:-3000}

# Start the app using the start command from root package.json
CMD ["pnpm", "start"]