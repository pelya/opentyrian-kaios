#!/bin/bash

make -j8 debug || exit 1
./opentyrian
