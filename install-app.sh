#!/bin/bash

[ -e make-kaios-install/Makefile ] || git submodule update --init --recursive

FOLDER="$1"
[ -z "$FOLDER" ] && FOLDER=debug
ID=OpenTyrian

adb push ${FOLDER}/$ID.zip /data/local/tmp/b2g/$ID/application.zip  || exit 1

cd make-kaios-install

make FOLDER=$FOLDER ID=$ID install || exit 1
