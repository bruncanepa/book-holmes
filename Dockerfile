# Use an official Node.js runtime as the base image
FROM node:18

# Set working directory
WORKDIR /app

# Copy the entire monorepo but apps/web
COPY . /app
RUN rm -rf apps/web
RUN rm -rf apps/processor

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install
RUN cd apps/websockets && pnpm install
RUN cd ../..

# Run the build command from root package.json
RUN pnpm run build

# Create a non-root user
# RUN groupadd -r bruno && useradd -r -g bruno -G audio,video bruno \
#     && chown -R bruno:bruno /home/bruno \
#     && chown -R bruno:bruno /app

ENV NODE_ENV=production

# Switch to non-root user
# USER bruno

# Expose port (Heroku will set PORT env variable)
EXPOSE ${PORT:-3000}

# Start the app using the start command from root package.json
CMD ["pnpm", "start"]