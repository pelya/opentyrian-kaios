//
// Copyright (C) 2021 Sergii Pylypenko
//
// ZLIB license.
//
// This software is provided 'as-is', without any express or implied
// warranty.  In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//    claim that you wrote the original software. If you use this software
//    in a product, an acknowledgment in the product documentation would be
//    appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//    misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.
//


#ifndef __SYS_KAIOS__
#define __SYS_KAIOS__

#ifdef EMSCRIPTEN
#define FS_WRITE_MOUNT_POINT "/save"
#else
#define FS_WRITE_MOUNT_POINT "."
#endif

// On KaiOS IndexedDB refuses to save files bigger than 16 Mb
// You must split all files that you write to storage into 8 Mb chunks
#define FS_MAX_FILE_SIZE (8 * 1024 * 1024)

extern void sys_fs_init(void);
extern int sys_fs_init_get_done(void);
extern void sys_fs_sync(void);
extern int sys_fs_sync_get_done(void);
extern void sys_take_wake_lock(void);
extern void sys_free_wake_lock(void);

#endif
