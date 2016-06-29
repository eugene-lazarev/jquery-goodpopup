module.exports = function(grunt) {
    grunt.initConfig({
        cssmin: {
            main: {
                files: {
                    'build/css/style.min.css': 'src/css/style.css'
                }
            }
        },
        uglify: {
            main: {
                options: {
                    sourceMap: true
                },
                files: {
                    'build/js/script.min.js': 'src/js/script.js'
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.registerTask('default', ['cssmin', 'uglify']);
};
