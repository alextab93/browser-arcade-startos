FROM nginx:1.30.4-alpine3.24@sha256:97d490c12ba55b4946b01546d1c3ed324e8d41ab1c9fcb2a616aa470620e5b46

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY app/ /usr/share/nginx/html/
COPY third_party/ /usr/share/nginx/html/licenses/
RUN chmod -R a-w /usr/share/nginx/html

EXPOSE 80
