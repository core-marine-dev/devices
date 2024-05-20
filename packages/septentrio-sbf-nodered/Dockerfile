FROM nodered/node-red:latest-18

USER root
RUN    mkdir -m 777 /components && chown node-red:node-red /components\
    && mkdir -m 777 /config     && chown node-red:node-red /config    \
    && mkdir -m 777 /db         && chown node-red:node-red /db        \
    && mkdir -m 777 /static     && chown node-red:node-red /static    \
    && mkdir -m 777 /tests      && chown node-red:node-red /tests     
COPY --chown=node-red:node-red --chmod=777 tests/nodered/components/ /components/

USER node-red

RUN npm i --production @coremarine/septentrio-sbf /components 
