/* 
 * OpenTyrian: A modern cross-platform port of Tyrian
 * Copyright (C) 2007-2009  The OpenTyrian Development Team
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

#include "loudness.h"

#include "file.h"
#include "lds_play.h"
#include "nortsong.h"
#include "opentyr.h"
#include "params.h"

#include <stdlib.h>

#ifdef AUDIO_WORKER_MAIN

#include <emscripten.h>

void w_play_song(char *data, int size, void *arg)
{
	(void) data;
	(void) size;

	play_song((Uint32) arg);
}

void w_restart_song(char *data, int size, void *arg)
{
	(void) data;
	(void) size;
	(void) arg;

	restart_song();
}

void w_stop_song(char *data, int size, void *arg)
{
	(void) data;
	(void) size;
	(void) arg;

	stop_song();
}

void w_fade_song(char *data, int size, void *arg)
{
	(void) data;
	(void) size;
	(void) arg;

	fade_song();
}

void w_set_volume(char *data, int size, void *arg)
{
	(void) data;
	(void) size;

	Uint32 iarg = (Uint32) arg;
	int music = iarg & 0x0000ffff;
	int samples = (iarg & 0xffff0000) / 0x10000;
	music_disabled = (music == 0);
	samples_disabled = (samples == 0);
	set_volume(music, samples);
}

void w_play_sample(char *data, int size, void *arg)
{
	(void) data;
	(void) size;

	Uint32 iarg = (Uint32) arg;
	JE_byte samplenum = iarg & 0x000000ff;
	JE_byte chan = (iarg & 0x0000ff00) / 0x100;
	JE_byte vol = (iarg & 0x00ff0000) / 0x10000;
	JE_multiSamplePlay(samplenum, chan, vol);
}

void w_init(char *data, int size, void *arg)
{
	(void) data;
	(void) size;

	Uint32 iarg = (Uint32) arg;
	int samplerate = iarg & 0x00ffffff;
	bool xmas = (iarg & 0xff000000) != 0;
	worker_init_audio(samplerate, xmas);
}

void w_mix(char *data, int size, void *arg)
{
	(void) arg;

	mix_audio((unsigned char *) data, size);
	emscripten_worker_respond(data, size);
}

// Stubs
void JE_tyrianHalt( JE_byte code )
{
	printf("Error: called JE_tyrianHalt(%d)\n", code);
}

#endif // AUDIO_WORKER_MAIN
