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

#ifdef EMSCRIPTEN
#include <emscripten.h>
#endif


#ifdef AUDIO_WORKER_MAIN

static unsigned char *audio_buffer = NULL;

void w_init(char *data, int size, void *arg)
{
	(void) arg;
	(void) size;

	Uint32 samplerate = 0;
	Uint32 samples = 0;
	Uint32 xmas = 0;

	memcpy(&samplerate, data, sizeof(Uint32));
	memcpy(&samples, data + sizeof(Uint32), sizeof(Uint32));
	memcpy(&xmas, data + sizeof(Uint32) * 2, sizeof(Uint32));

	printf("Audio worker init: samplerate %u samples %u xmas %u\n", samplerate, samples, xmas);

	audio_buffer = malloc(samples * BYTES_PER_SAMPLE);
	worker_init_audio(samplerate, samples, xmas);
}

void w_mix(char *data, int size, void *arg)
{
	(void) data;
	(void) size;
	Uint32 iarg = (Uint32) arg;

	mix_audio(audio_buffer, iarg);
	emscripten_worker_respond((char *) audio_buffer, iarg);
}

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

// Stubs
void JE_tyrianHalt( JE_byte code )
{
	printf("Audio worker error: called JE_tyrianHalt(%d)\n", code);
}

#endif // AUDIO_WORKER_MAIN

#ifdef USE_AUDIO_WORKER

static worker_handle worker = -1;
static unsigned char *audio_buffer = NULL;
static bool audio_buffer_ready = false;

void worker_init_audio( int samplerate, int samples, bool xmas )
{
	char params[sizeof(Uint32) * 3] = "";
	Uint32 d = 0;

	d = samplerate;
	memcpy(params, &d, sizeof(Uint32));
	d = samples;
	memcpy(params + sizeof(Uint32), &d, sizeof(Uint32));
	d = xmas;
	memcpy(params + sizeof(Uint32) * 2, &d, sizeof(Uint32));

	audio_buffer = malloc(samples * BYTES_PER_SAMPLE);
	memset(audio_buffer, 0, samples * BYTES_PER_SAMPLE);

	printf("Starting audio worker: samplerate %u samples %u xmas %u\n", samplerate, samples, xmas);

	worker = emscripten_create_worker("audio.js");
	emscripten_call_worker(worker, "_w_init", params, sizeof(params), NULL, NULL);
	audio_buffer_ready = true; // Start the first mix iteration
}

// This code performs double copy, first it copies data to audio_buffer,
// and then from audio_buffer to the buffer in mix_audio().
// And there is a third copy inside Emscripten code,
// it copies worker response from JS Uint8Array into C malloc()-ed buffer
void mix_audio_result(char *data, int size, void *arg)
{
	(void) arg;
	memcpy(audio_buffer, data, size);
	audio_buffer_ready = true;
}

void mix_audio( unsigned char *buffer, int howmuch )
{
	if (audio_buffer_ready)
	{
		audio_buffer_ready = false;
		emscripten_call_worker(worker, "_w_mix", NULL, 0, mix_audio_result, (void *) howmuch);
		memcpy(buffer, audio_buffer, howmuch);
	}
	else
	{
		memset(buffer, 0, howmuch);
	}
}

void play_song( unsigned int song_num )
{
	Uint32 iarg = song_num;
	emscripten_call_worker(worker, "_w_play_song", NULL, 0, NULL, (void *) iarg);
}

void restart_song( void )
{
	emscripten_call_worker(worker, "_w_restart_song", NULL, 0, NULL, NULL);
}

void stop_song( void )
{
	emscripten_call_worker(worker, "_w_stop_song", NULL, 0, NULL, NULL);
}

void fade_song( void )
{
	emscripten_call_worker(worker, "_w_fade_song", NULL, 0, NULL, NULL);
}

void set_volume( unsigned int music, unsigned int sample )
{
	Uint32 iarg = 0;
	if (music_disabled)
		music = 0;
	if (samples_disabled)
		sample = 0;
	iarg = (music & 0x0000ffff) | ((sample * 0x10000) & 0xffff0000);
	emscripten_call_worker(worker, "_w_set_volume", NULL, 0, NULL, (void *) iarg);
}

void JE_multiSamplePlay(JE_byte samplenum, JE_byte chan, JE_byte vol)
{
	Uint32 iarg = (samplenum & 0x000000ff) | ((chan * 0x100) & 0x0000ff00) | ((vol * 0x10000) & 0x00ff0000);
	emscripten_call_worker(worker, "_w_play_sample", NULL, 0, NULL, (void *) iarg);
}

#endif // USE_AUDIO_WORKER
