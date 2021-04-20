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
static unsigned int audio_buffer_size = 0;

void w_init(char *data, int size)
{
	(void) size;
	Uint32 *args = (Uint32 *) data;

	Uint32 samplerate = args[0];
	Uint32 samples = args[1];
	Uint32 xmas = args[2];

	printf("Audio worker init: samplerate %u samples %u xmas %u\n", samplerate, samples, xmas);

	audio_buffer_size = samples * BYTES_PER_SAMPLE;
	audio_buffer = malloc(audio_buffer_size);
	worker_init_audio(samplerate, samples, xmas);
}

void w_mix(char *data, int size)
{
	(void) data;
	(void) size;

	//printf("w_mix data %p size %d\n", (void *) data, size);
	mix_audio(audio_buffer, audio_buffer_size);
	emscripten_worker_respond((char *) audio_buffer, audio_buffer_size);
}

void w_play_song(char *data, int size)
{
	(void) size;
	Uint32 *args = (Uint32 *) data;

	//printf("w_play_song %u\n", args[0]);
	play_song(args[0]);
}

void w_restart_song(char *data, int size)
{
	(void) data;
	(void) size;

	restart_song();
}

void w_stop_song(char *data, int size)
{
	(void) data;
	(void) size;

	stop_song();
}

void w_fade_song(char *data, int size)
{
	(void) data;
	(void) size;

	fade_song();
}

void w_set_volume(char *data, int size)
{
	(void) size;
	Uint32 *args = (Uint32 *) data;

	int music = args[0];
	int samples = args[1];

	music_disabled = (music == 0);
	samples_disabled = (samples == 0);
	//printf("w_set_volume %u %u music_disabled %u samples_disabled %u\n", music, samples, music_disabled, samples_disabled);
	set_volume(music, samples);
}

void w_play_sample(char *data, int size)
{
	(void) size;
	Uint32 *args = (Uint32 *) data;

	JE_byte samplenum = args[0];
	JE_byte chan = args[1];
	JE_byte vol = args[2];
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
	emscripten_call_worker(worker, "w_init", params, sizeof(params), NULL, NULL);
	audio_buffer_ready = true; // Start the first mix iteration
	printf("Started audio worker: ID %u\n", worker);
	set_volume(tyrMusicVolume, fxVolume);
}

// This code performs double copy, first it copies data to audio_buffer,
// and then from audio_buffer to the buffer in mix_audio().
// And there is a third copy inside Emscripten code,
// it copies worker response from JS Uint8Array into C heap.
// And after that, it's copied for the fourth time from C heap into JS audio callback.
void mix_audio_result(char *data, int size, void *arg)
{
	(void) arg;
	//printf("mix_audio_result size %u\n", size);
	memcpy(audio_buffer, data, size);
	audio_buffer_ready = true;
}

void mix_audio( unsigned char *buffer, int howmuch )
{
	//printf("mix_audio buffer ready %u buffer size %u\n", audio_buffer_ready, howmuch);
	if (audio_buffer_ready)
	{
		audio_buffer_ready = false;
		emscripten_call_worker(worker, "w_mix", NULL, 0, mix_audio_result, NULL);
		memcpy(buffer, audio_buffer, howmuch);
	}
	else
	{
		memset(buffer, 0, howmuch);
	}
}

void play_song( unsigned int song_num )
{
	Uint32 data[1] = { song_num };
	emscripten_call_worker(worker, "w_play_song", (char *) data, sizeof(data), NULL, NULL);

	song_playing = song_num;
}

void restart_song( void )
{
	emscripten_call_worker(worker, "w_restart_song", NULL, 0, NULL, NULL);
}

void stop_song( void )
{
	emscripten_call_worker(worker, "w_stop_song", NULL, 0, NULL, NULL);
}

void fade_song( void )
{
	emscripten_call_worker(worker, "w_fade_song", NULL, 0, NULL, NULL);
}

void set_volume( unsigned int music, unsigned int sample )
{
	if (worker == -1)
		return;
	if (music_disabled)
		music = 0;
	if (samples_disabled)
		sample = 0;
	Uint32 data[2] = { music, sample };
	//printf("set_volume %d %d\n", music, sample);
	emscripten_call_worker(worker, "w_set_volume", (char *) data, sizeof(data), NULL, NULL);
}

void JE_multiSamplePlay(JE_byte samplenum, JE_byte chan, JE_byte vol)
{
	Uint32 data[3] = { samplenum, chan, vol };
	emscripten_call_worker(worker, "w_play_sample", (char *) data, sizeof(data), NULL, NULL);
}

#endif // USE_AUDIO_WORKER
