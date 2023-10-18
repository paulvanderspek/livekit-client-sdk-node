# Determine the OS
UNAME := $(shell uname)

# Shared library extension
ifeq ($(UNAME), Darwin)
	LIB_EXT := dylib
else
	LIB_EXT := so
endif

# Compiler
CC := gcc

# Flags
CFLAGS := -Wall -Wextra -O2 -fPIC

# Source and object files
SRC := bridge.c
OBJ := bridge.o
LIB := libbridge.$(LIB_EXT)

# Targets
all: $(LIB)

$(LIB): $(OBJ)
	$(CC) -shared -o $@ $^

$(OBJ): $(SRC)
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f $(OBJ) $(LIB)
