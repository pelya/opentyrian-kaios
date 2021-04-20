# BUILD SETTINGS ###############################################################

ifneq ($(filter Msys Cygwin, $(shell uname -o)), )
    PLATFORM := WIN32
    TYRIAN_DIR = C:\\TYRIAN
else
    PLATFORM := UNIX
    TYRIAN_DIR = $(gamesdir)/tyrian
endif

WITH_NETWORK := false

################################################################################

# see https://www.gnu.org/prep/standards/html_node/Makefile-Conventions.html

SHELL = /bin/sh

CC ?= clang
ifeq ($(CC), cc)
CC := clang
endif

INSTALL ?= install
PKG_CONFIG ?= pkg-config

VCS_IDREV ?= (git describe --tags || git rev-parse --short HEAD)

INSTALL_PROGRAM ?= $(INSTALL)
INSTALL_DATA ?= $(INSTALL) -m 644

prefix ?= /usr/local
exec_prefix ?= $(prefix)

bindir ?= $(exec_prefix)/bin
datarootdir ?= $(prefix)/share
datadir ?= $(datarootdir)
docdir ?= $(datarootdir)/doc/opentyrian
mandir ?= $(datarootdir)/man
man6dir ?= $(mandir)/man6
man6ext ?= .6

# see http://www.pathname.com/fhs/pub/fhs-2.3.html

gamesdir ?= $(datadir)/games

###

TARGET := opentyrian
OBJDIR := obj
APPDATA := data
TARGET_AUDIO :=
ifneq ($(EMSCRIPTEN),)
TARGET := app.js
OBJDIR := obj-js
APPDATA := appdata.js
TARGET_AUDIO := audio.js
endif

SRCS := $(wildcard src/*.c)
OBJS := $(SRCS:src/%.c=$(OBJDIR)/%.o)
DEPS := $(SRCS:src/%.c=$(OBJDIR)/%.d)

###

ifeq ($(WITH_NETWORK), true)
    EXTRA_CPPFLAGS += -DWITH_NETWORK
endif

OPENTYRIAN_VERSION := $(shell $(VCS_IDREV) 2>/dev/null && \
                              touch src/opentyrian_version.h)
ifneq ($(OPENTYRIAN_VERSION), )
    EXTRA_CPPFLAGS += -DOPENTYRIAN_VERSION='"$(OPENTYRIAN_VERSION)"'
endif

CPPFLAGS ?= -MMD
CPPFLAGS += -DNDEBUG
CFLAGS ?= -pedantic \
          -Wall \
          -Wextra \
          -Wno-missing-field-initializers \
          -Werror=format \
          -Werror=format-security \
          -Werror=format-nonliteral \
          -Werror=implicit-function-declaration \
          -Wunused-result \
          -Wno-gnu-zero-variadic-macro-arguments \
          -O3 -flto
LDFLAGS ?= -O3 -flto
LDLIBS ?=

ifneq ($(EMSCRIPTEN),)
    SDL_CPPFLAGS := -s USE_SDL=2 \
                    -s WASM=0 \
                    -s ALLOW_MEMORY_GROWTH=1 \
                    -s INITIAL_MEMORY=8388608 \
                    -s NO_EXIT_RUNTIME=1 \
                    -s EXTRA_EXPORTED_RUNTIME_METHODS=['FS','UTF8ToString'] \
                    -s FORCE_FILESYSTEM=1 \
                    -s ASSERTIONS=0 \
                    -s ASYNCIFY=1 \
                    -D KAIOS_SWAP_NAVIGATION_KEYS=1 \
                    -D USE_AUDIO_WORKER=1
    SDL_LDFLAGS := $(SDL_CPPFLAGS)
    SDL_LDLIBS := -lidbfs.js --pre-js appdata.js
else ifeq ($(WITH_NETWORK), true)
    SDL_CPPFLAGS := $(shell $(PKG_CONFIG) sdl2 SDL2_net --cflags)
    SDL_LDFLAGS := $(shell $(PKG_CONFIG) sdl2 SDL2_net --libs-only-L --libs-only-other)
    SDL_LDLIBS := $(shell $(PKG_CONFIG) sdl2 SDL2_net --libs-only-l)
else
    SDL_CPPFLAGS := $(shell $(PKG_CONFIG) sdl2 --cflags)
    SDL_LDFLAGS := $(shell $(PKG_CONFIG) sdl2 --libs-only-L --libs-only-other)
    SDL_LDLIBS := $(shell $(PKG_CONFIG) sdl2 --libs-only-l)
endif

ALL_CPPFLAGS = -DTARGET_$(PLATFORM) \
               -DTYRIAN_DIR='"$(TYRIAN_DIR)"' \
               $(EXTRA_CPPFLAGS) \
               $(SDL_CPPFLAGS) \
               $(CPPFLAGS)
ifneq ($(EMSCRIPTEN),)
ALL_CFLAGS = -std=gnu99 \
             $(CFLAGS)
else
ALL_CFLAGS = -std=iso9899:1999 \
             $(CFLAGS)
endif
ALL_LDFLAGS = $(SDL_LDFLAGS) \
              $(LDFLAGS)
ALL_LDLIBS = -lm \
             $(SDL_LDLIBS) \
             $(LDLIBS)

###

.PHONY : all
all : $(TARGET) $(TARGET_AUDIO)

.PHONY : debug
debug : CPPFLAGS += -UNDEBUG
debug : CFLAGS += -O0 -g4 -fno-lto
debug : LDFLAGS += -O0 -g4 -fno-lto
ifneq ($(EMSCRIPTEN),)
debug : CFLAGS += -s ASSERTIONS=2 -s WASM=1 # -fsanitize=undefined -s SAFE_HEAP=1 -s WASM=1
debug : LDFLAGS += -s WASM=1
endif
debug : all

.PHONY : installdirs
installdirs :
	mkdir -p $(DESTDIR)$(bindir)
	mkdir -p $(DESTDIR)$(docdir)
	mkdir -p $(DESTDIR)$(man6dir)

.PHONY : install
install : $(TARGET) installdirs
	$(INSTALL_PROGRAM) $(TARGET) $(DESTDIR)$(bindir)/
	$(INSTALL_DATA) CREDITS NEWS README $(DESTDIR)$(docdir)/
	$(INSTALL_DATA) linux/man/opentyrian.6 $(DESTDIR)$(man6dir)/opentyrian$(man6ext)

.PHONY : uninstall
uninstall :
	rm -f $(DESTDIR)$(bindir)/$(TARGET)
	rm -f $(DESTDIR)$(docdir)/{CREDITS,NEWS,README}
	rm -f $(DESTDIR)$(man6dir)/opentyrian$(man6ext)

.PHONY : clean
clean :
	rm -f $(OBJS)
	rm -f $(DEPS)
	rm -f $(TARGET)

$(TARGET) : $(OBJS) $(APPDATA)
	$(CC) $(ALL_CFLAGS) $(ALL_LDFLAGS) -o $@ $(filter-out $(APPDATA), $^) $(ALL_LDLIBS)

-include $(DEPS)

$(OBJDIR)/%.o : src/%.c
	@mkdir -p "$(dir $@)"
	$(CC) $(ALL_CPPFLAGS) $(ALL_CFLAGS) -c -o $@ $<

$(APPDATA):
	$(EMSCRIPTEN_TOOLS)/file_packager appdata.data --js-output=$@ --preload data@data

# AUDIO JS WORKER ###############################################################

OBJDIR_AUDIO := obj-audio

SRCS_AUDIO := src/audio_worker.c src/loudness.c src/lds_play.c src/nortsong.c src/opl.c src/file.c
OBJS_AUDIO := $(SRCS_AUDIO:src/%.c=$(OBJDIR_AUDIO)/%.o)
DEPS_AUDIO := $(SRCS_AUDIO:src/%.c=$(OBJDIR_AUDIO)/%.d)

CPPFLAGS_AUDIO := -s USE_SDL=2 \
                  -s WASM=0 \
                  -s ALLOW_MEMORY_GROWTH=1 \
                  -s INITIAL_MEMORY=8388608 \
                  -s NO_EXIT_RUNTIME=1 \
                  -s EXTRA_EXPORTED_RUNTIME_METHODS=['FS','UTF8ToString'] \
                  -s FORCE_FILESYSTEM=1 \
                  -s ASSERTIONS=0 \
                  -s BUILD_AS_WORKER=1 \
                  -s EXPORTED_FUNCTIONS="['_w_init','_w_mix','_w_play_song','_w_restart_song','_w_stop_song','_w_fade_song','_w_set_volume','_w_play_sample']" \
                  -D AUDIO_WORKER_MAIN=1 \
                  -D TARGET_$(PLATFORM) \
                  -D TYRIAN_DIR='"$(TYRIAN_DIR)"' \
                  --pre-js appdata.js

$(TARGET_AUDIO) : $(OBJS_AUDIO)
	$(CC) $(CPPFLAGS_AUDIO) $(ALL_CFLAGS) -o $@ $^

-include $(DEPS_AUDIO)

$(OBJDIR_AUDIO)/%.o : src/%.c
	@mkdir -p "$(dir $@)"
	$(CC) $(CPPFLAGS_AUDIO) $(ALL_CFLAGS) -c -o $@ $<
