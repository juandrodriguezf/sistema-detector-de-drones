include("${CMAKE_CURRENT_LIST_DIR}/rule.cmake")
include("${CMAKE_CURRENT_LIST_DIR}/file.cmake")

set(m3_default_library_list )


# Main target for this project
add_executable(m3_default_image_dBlVqraZ ${m3_default_library_list})

set_target_properties(m3_default_image_dBlVqraZ PROPERTIES
    OUTPUT_NAME "default"
    SUFFIX ".elf"
    ADDITIONAL_CLEAN_FILES "${output_extensions}"
    RUNTIME_OUTPUT_DIRECTORY "${m3_default_output_dir}")


# Add the link options from the rule file.
m3_default_link_rule( m3_default_image_dBlVqraZ)


