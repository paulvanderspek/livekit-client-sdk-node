#include <stdint.h>

void* cast_to_void_ptr(uint64_t ptr) {
  return (void*)ptr;
}

uint8_t* cast_to_uint8_ptr(uint64_t ptr) {
  return (uint8_t*)ptr;
}

int16_t* cast_to_int16_ptr(uint64_t ptr) {
    return (int16_t*)ptr;
}
