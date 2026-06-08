# The following variables contains the files used by the different stages of the build process.
set(m3_default_image_name "default.elf")
set(m3_default_image_base_name "default")

# The output directory of the final image.
set(m3_default_output_dir "${CMAKE_CURRENT_SOURCE_DIR}/../../../out/m3")

# The full path to the final image.
set(m3_default_full_path_to_image ${m3_default_output_dir}/${m3_default_image_name})

# Potential output file extensions
set(output_extensions
    .hex
    .hxl
    .mum
    .o
    .sdb
    .sym
    .cmf)
list(TRANSFORM output_extensions PREPEND "${m3_default_output_dir}/${m3_default_image_base_name}")
