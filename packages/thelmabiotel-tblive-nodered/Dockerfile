FROM nodered/node-red:latest-18

USER root
RUN mkdir -p /components && chown node-red /components\
    && mkdir -p /config && chown node-red /config\
    && mkdir -p /db && chown node-red /db\
    && mkdir -p /files && chown node-red /files\
    && mkdir -p /static && chown node-red /static\
    && mkdir -p /tests && chown node-red /tests
USER node-red
# Copy package.json to the WORKDIR so npm builds all
# of your added nodes modules for Node-RED
# COPY ./data/package.json .

# COPY ./package.json /components/package.json
# COPY ./src/ /components/src/

# RUN npm install --unsafe-perm --no-update-notifier --no-fund --only=production --loglevel=verbose

# RUN npm install @coremarine/norsub-emru@">=1.0.2" /components
