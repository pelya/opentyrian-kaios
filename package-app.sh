#!/bin/bash

DIR="$1"
[ -z "$DIR" ] && DIR=debug

rm -rf $DIR
mkdir -p $DIR
cp -f *.html *.js *.mem *.data *.wasm $DIR/

cd app
cp -f *.webapp *.html *.js *.json *.png *.jpg *.ico *.gif ../$DIR
cd ..

cd $DIR

LEVEL=
[ "$DIR" = "release" ] && LEVEL=-9
[ "$DIR" = "debug" ] && sed -i 's/var sys_debug = 0;/var sys_debug = 1;/' sys.js

cp -f *.html *.js *.mem *.data *.wasm *.png *.jpg *.ico *.gif ../

rm -f application.zip
zip $LEVEL application.zip *.webapp *.html *.js *.mem *.data *.wasm *.png *.jpg *.ico *.gif

zip $LEVEL OpenTyrian-omnisd.zip application.zip metadata.json

mv application.zip OpenTyrian.zip
