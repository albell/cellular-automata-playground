const nodeSass = require('node-sass');

module.exports = function(grunt) {

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		jshint: {
			all: ['Gruntfile.js', 'js/c-a.js'],
			options: {
				esversion: 6,
			},
		},

		jscs: {
			src: 'js/c-a.js',
			options: {
				config: "jquery-jscs.json",
			},
		},

		uglify: {
			js: {
				options : {
					mangle: false,
					compress: false,
					//{	toplevel: true // turn on for final build
					//},
					screwIE8: true,
					sourceMap: true,
				},
				files: {
					'js/min/c-a-min.js': 'js/c-a.js',
				},
			},
		},

		sass: {
			options: {
				implementation: nodeSass,
				outputStyle: 'compressed',
				sourceMap: true,
			},
			dist: {
				files: {
					'css/style.min.css': 'css/style.scss',
				},
			},
		},

		watch: {
			scripts: {
				files: ['js/c-a.js'],
				tasks: ['jshint', 'jscs', 'uglify'],
				options: {
				},
			},
			scss: {
				files: ['css/*.scss'],
				tasks: ['sass'],
				options: {
					spawn: false,
				},
			},
		}
	});

	grunt.loadNpmTasks("grunt-jscs");
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-uglify-es');
	grunt.loadNpmTasks('grunt-sass');
	grunt.loadNpmTasks('grunt-contrib-watch');

	grunt.registerTask('default', ['jshint', 'jscs', 'uglify', 'sass']);
};
