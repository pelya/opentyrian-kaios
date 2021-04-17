#!/bin/sh


convert -delay 20 -loop 0 -dispose previous -gravity center -extent 24x21 -background 'rgba(0,0,0,0)' \
icon-0.png icon-1.png icon-2.png icon-3.png icon-4.png icon-5.png icon-6.png icon-7.png \
icon_24.gif

convert -magnify -gravity center -extent 56x56 icon_24.gif icon_56.gif

convert -magnify -magnify -gravity center -extent 112x112 icon_24.gif icon_112.gif

gif2apng icon_56.gif ../icon_56.png || { echo "sudo apt-get install gif2apng"; exit 1; }

#convert -delay 20 -loop 0 -dispose previous -gravity center -extent 56x56 -background 'rgba(0,0,0,0)' \
#icon-0.png icon-1.png icon-2.png icon-3.png icon-4.png icon-5.png icon-6.png icon-7.png \
#+repage icon_112.gif

gif2apng icon_112.gif ../icon_112.png
