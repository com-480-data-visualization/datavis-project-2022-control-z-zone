class MapPlot {
	
	makeColorbar(svg, color_scale, top_left, colorbar_size, format) {

		const svg_viewbox = svg.node().viewBox.animVal;
		var svg_width = svg_viewbox.width;
		var svg_height = svg_viewbox.height;

		const value_to_svg =  d3.scaleLinear()
			.domain(color_scale.domain())
			.range([colorbar_size[1], 0]);

		const range01_to_color = d3.scaleLinear()
			.domain([0, 1])
			.range(color_scale.range())
			.interpolate(color_scale.interpolate());

		// Axis numbers
		const colorbar_axis = d3.axisLeft(value_to_svg)
			.tickFormat(d3.format(format))
			.tickPadding(8);

		const colorbar_g = svg.append("g")
			.classed("colorbar", true)
			.attr("id", "colorbar")
			.attr("transform", "translate(" + top_left[0]+ ', ' + top_left[1] + ")")
			.call(colorbar_axis);

		// Create the gradient
		function range01(steps) {
			return Array.from(Array(steps), (elem, index) => index / (steps-1));
		}

		svg.append("text")
			.classed("colorbar", true)
			.attr("class", "y label")
			.attr("text-anchor", "end")
			.attr("x", - (svg_height / 4 + 15))
			.attr("y", 20)
			//.attr("y", top_left[0])
			.style("font-size", "15px")
			.attr("transform", "rotate(-90)")
			.text("Relative number of stops");

		const svg_defs = svg.append("defs").classed("colorbar", true);

		const gradient = svg_defs.append('linearGradient')
			.attr('id', 'colorbar-gradient')
			.attr('x1', '0%') // bottom
			.attr('y1', '100%')
			.attr('x2', '0%') // to top
			.attr('y2', '0%')
			.attr('spreadMethod', 'pad');

		gradient.selectAll('stop')
			.data(range01(10))
			.enter()
			.append('stop')
				.attr('offset', d => 100*d + '%')
				.attr('stop-color', d => range01_to_color(d))
				.attr('stop-opacity', 1);

		// create the colorful rect
		colorbar_g.append('rect')
			.classed("colorbar", true)
			.attr('id', 'colorbar-area')
			.attr('width', colorbar_size[0])
			.attr('height', colorbar_size[1])
			//.attr("transform", "translate(" + top_left[0] + ', ' + top_left[1] + ")")
			.style('fill', 'url(#colorbar-gradient)')
			.style('stroke', 'black')
			.style('stroke-width', '1px');
	}

	constructor(svg_element_id) {

		var map_svg = d3.select('#' + svg_element_id);

		var race = true
		var gender = false

		var states_available = ["California", "Texas"]

		var states_selected = {}
		var num_selected = 0

		var usa_view = true

		//------------------------------- MAP ----------------------------------//

		// may be useful for calculating scales
		const svg_viewbox = map_svg.node().viewBox.animVal;
		var svg_width = svg_viewbox.width;
		var svg_height = svg_viewbox.height;

		// California
		const projection_ca = d3.geoMercator()
			.rotate([0, 0])
			.center([-120, 37])
			.scale(1400)
			.translate([svg_width / 4 + 20, svg_height / 2]) // SVG space
			.precision(.1);

		// path generator to convert JSON to SVG paths
		const path_generator_ca = d3.geoPath()
			.projection(projection_ca);

		// Texas
		const projection_tx = d3.geoMercator()
			.rotate([0, 0])
			.center([-99, 31])
			.scale(1400)
			.translate([svg_width / 2 + svg_width / 4, svg_height / 2]) // SVG space
			.precision(.1);

		// path generator to convert JSON to SVG paths
		const path_generator_tx = d3.geoPath()
			.projection(projection_tx);

		// USA
		const projection_usa = d3.geoMercator()
			.rotate([0, 0])
			.center([-99, 31])
			.scale(600)
			.translate([svg_width / 2 , svg_height * 0.75]) // SVG space
			//.precision(.1);

		// path generator to convert JSON to SVG paths
		const path_generator_usa = d3.geoPath()
			.projection(projection_usa);

		const map_promise_usa = d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json").then((topojson_raw) => {
			const counties_paths = topojson.feature(topojson_raw, topojson_raw.objects.states);
			return counties_paths.features;
		});


		var tooltip = d3.select("#map_div")
							.append("div")
							.attr('id', 'tooltip')
							.attr("class", "county_name")
							.style("position", "absolute")
							.style("visibility", "hidden")
							.style("background-color", "white")
							.style("border", "solid")
							.style("border-width", "1px")
							.style("border-radius", "5px")
							.style("padding", "10px");
		
		var mouseover = function(d) {

			var html_text = ""

			if (d.properties.stops > 0) html_text = ("<b>" + d.properties.NAME + "</b> <br> <br> Stops: " + d.properties.stops + "<br> Relative stops: " 
													+ d.properties.relative_stops.toFixed(4) ) //+ "<br> Population: " + d.properties.population
			else html_text = "<b>" + d.properties.NAME + "</b> <br> <br> <i> Less than 100 stops </i>"
			d3.select(this).style('opacity', 0.6)
			d3.select('#tooltip')
				.style('opacity', 1)
				.style("visibility", "visible")
				.html(html_text)
		}

		var mousemove = function(d) {
			d3.select('#tooltip')
				.style('left', d3.event.pageX + 10 + 'px')
				.style('top', d3.event.pageY - 55 + 'px')
		  }

		var mouseout = function(d) {
			d3.select(this).style('opacity', 1)
			d3.select('#tooltip')
				.style("visibility", "hidden")
		}

		function choicesSelector(race) {
			return (race) ? ["white", "black", "asian/pacific islander", "hispanic"] : ["male", "female"]
		}

		// Either hardcode choices for race and sex or fetch from data
		var choices = choicesSelector(race)

		var selection_button = d3.select("#selectButton")
		var race_button = d3.select("#race_btn")
		var gender_button = d3.select("#gender_btn")
		var play_button = d3.select("#play-button")
		var map_button = d3.select("#map_btn")
				
		Promise.all([map_promise_usa]).then((results) => {

			let map_data_usa = results[0];

			const map_promise_ca = d3.json("https://raw.githubusercontent.com/deldersveld/topojson/master/countries/us-states/CA-06-california-counties.json").then((topojson_raw) => {
				const counties_paths = topojson.feature(topojson_raw, topojson_raw.objects.cb_2015_california_county_20m);
				return counties_paths.features;
			});

			const map_promise_tx = d3.json("https://raw.githubusercontent.com/deldersveld/topojson/master/countries/us-states/TX-48-texas-counties.json").then((topojson_raw) => {
				const counties_paths = topojson.feature(topojson_raw, topojson_raw.objects.cb_2015_texas_county_20m);
				return counties_paths.features;
			});

			const data_path_race =  "data/arrest_ethnicity.csv"
			const data_path_gender = "data/arrest_gender.csv"
			
			const data_promise_race = d3.csv(data_path_race).then((data) => {
				return data
			})

			const data_promise_gender = d3.csv(data_path_gender).then((data) => {
				return data
			})

			const data_path_graph_race = "data/count_ethnicity_state.csv"
			const data_path_graph_gender = "data/count_gender_state.csv"

			const data_promise_graph_race = d3.csv(data_path_graph_race).then((data) => {
				return data
			})

			const data_promise_graph_gender = d3.csv(data_path_graph_gender).then((data) => {
				return data
			})

			const map_promises = [map_promise_ca, map_promise_tx, data_promise_race, data_promise_gender, data_promise_graph_race, data_promise_graph_gender]

			var map_container_usa = map_svg.append('g');

			var clickState = function(d) {

				const state = d.properties.name
	
				if (states_available.includes(state)) {

					if (states_selected[state]) {
	
						states_selected[state] = false
						num_selected -= 1
	
						d3.select(this).style("stroke-width", "1px")
		
					} else {
		
						if (num_selected < 2) {
		
							states_selected[state] = true
							num_selected += 1
	
							d3.select(this).style("stroke-width", "3px")
		
							if (num_selected == 2) {

								setTimeout(() => clearUsa(), 500)
								setTimeout(() => createDualGraph(map_promises, map_svg), 500)
								setTimeout(() => {
									d3.select("#map-view-top").attr("hidden", "hidden")
									d3.select("#line-text").attr("hidden", null)
									d3.select("#line-text-below").attr("hidden", null)
								}, 550)
							}
						}
					}
				}	
			}

			var mouseover_usa = function(d) {
				
				var html_text = ""
	
				html_text = "<b>" + d.properties.name+ "</b> "
				
				if (usa_view) {
					d3.select(this).style('opacity', 0.6)
					d3.select('#tooltip')
						.style('opacity', 1)
						.style("visibility", "visible")
						.html(html_text)
				} else {
					d3.select('#tooltip')
					.style("visibility", "hidden")
				}
			}

			var mousemove_usa = function(d) {

				if (!usa_view) {
					d3.select('#tooltip')
					.style("visibility", "hidden")
				}
				d3.select('#tooltip')
					.style('left', d3.event.pageX + 10 + 'px')
					.style('top', d3.event.pageY - 55 + 'px')
			  }
	
			var mouseout_usa = function(d) {

				if (usa_view) {
					d3.select(this).style('opacity', 1)
				}
				d3.select('#tooltip')
					.style("visibility", "hidden")
			}

			map_container_usa.selectAll(".state")
				.data(map_data_usa)
				.enter()
				.append("path")
				.classed("state", true)
				.attr("d", path_generator_usa)
				.style("fill", function(d) {
					if (states_available.includes(d.properties.name)) return "Crimson"
					else return "white"
				})
				.on("click", clickState)
				.on("mouseover", mouseover_usa)
				.on('mousemove', mousemove_usa)
				.on("mouseout", mouseout_usa);


			function clearUsa() {

				usa_view = false

				map_container_usa.selectAll(".state")
					.transition()
					.duration(300)
					.style("opacity", 0)
				
				num_selected = 0
				states_selected = {}

				setVisibilityButtons()
			}

			function setVisibilityButtons() {
				const visibility = usa_view ? "hidden" : "visible"

				play_button.style("visibility", visibility)
				race_button.style("visibility", visibility)
				gender_button.style("visibility", visibility)
				selection_button.style("visibility", visibility)
				map_button.style("visibility", visibility)

				d3.select('#tooltip')
				.style("visibility", visibility)
			}

			function createDualGraph(promises, map_svg) {

				Promise.all(promises).then((results) => {

					const stop_min = 0
		
					let map_data_ca = results[0];
					let map_data_tx = results[1];
					let data_race = results[2].filter(x => x.nb_arrest > stop_min); // remove counties with less than < 100 stops
					let data_gender = results[3].filter(x => x.nb_arrest > stop_min); // remove counties with less than < 100 stops
					let data_graph_race = results[4];
					let data_graph_gender = results[5];
		
					var data_map = (race) ? data_race : data_gender
					var data_graph = (race) ? data_graph_race : data_graph_gender
		
					var counties_id_stops = {}
					var dates = [...new Set(data_map.map(x=> x.year))].sort() //get all dates
					var state_choices = [...new Set(data_graph.map(x=> x.state))]

					buttonColor(gender_button, gender)
					buttonColor(race_button, race)

					selection_button.selectAll('myOptions')
							.data(choices)
							.enter()
							.append('option')
							.classed("selector", true)
							.text(function (d) { return d; })
							.attr("value", function (d) {return d; })
							.exit().remove()
		
					var domain_min = 0.0
					var domain_max = 0.0
		
					function getCountiesInfo(row) {
		
						var temp_dict = {}
		
						//temp_dict["stops"] = parseInt(row.relative)
						temp_dict["stops"] = parseFloat(row.nb_arrest)
						//temp_dict["relative_stops"] = Math.log10(temp_dict["stops"])
						temp_dict["relative_stops"] = parseFloat(row.relative)
						//temp_dict["population"] = parseInt(row.population)
		
						return temp_dict
					}
		
					function buildCountyInfo(data, selection=choices[0]) {
						
						counties_id_stops = {}
		
						if (race) {
		
							const df = data.filter(x => (x.year == dates[0]) && x.subject_race == selection)
			
							//const df_domain =  df.map(x => Math.log10(x.nb_arrest))
							const df_domain =  df.map(x => x.relative)
							domain_min = Math.floor(Math.min.apply(Math, df_domain))
							//domain_max = Math.ceil(Math.max.apply(Math, df_domain))
							domain_max = 2.5
							df.forEach((row) => {
								counties_id_stops[row.county_name] = getCountiesInfo(row)
							})
			
						} else {
			
							const df = data.filter(x => (x.year == dates[0]) && x.subject_sex == selection)
							
							//const df_domain =  df.map(x => Math.log10(x.nb_arrest))
							const df_domain =  df.map(x => x.relative)
							domain_min = Math.floor(Math.min.apply(Math, df_domain))
							//domain_max = Math.ceil(Math.max.apply(Math, df_domain))
							domain_max = 2.5
			
							df.forEach((row) => {
								counties_id_stops[row.county_name] = getCountiesInfo(row)
							})
						}
					}
		
					function setMapInfos(county) {
		
						const county_name = county.properties.NAME
		
						var county_stops = 0
						var county_relative_stops = 0.0
						var county_population = 0.0
		
						if (county_name in counties_id_stops) {
		
							const county_dict = counties_id_stops[county.properties.NAME]
		
							county_stops = county_dict["stops"];
							county_relative_stops = county_dict["relative_stops"];
							//county_population = county_dict["population"];
		
						}
		
						county.properties.stops = county_stops
						county.properties.relative_stops = county_relative_stops
						//county.properties.population = county_population
					}
		
					function buildMap(data, selection) {
		
						buildCountyInfo(data, selection)
		
						//add the data as a property of the county
						map_data_ca.forEach(county => {
							setMapInfos(county)
						});
		
						map_data_tx.forEach(county => {
							setMapInfos(county)
						});
					}
					
					buildMap(data_map, choices[0])
		
					// Order of creating groups decides what is on top
					var map_container_ca = map_svg.append('g');
					var map_container_tx = map_svg.append('g');
			
		
					var selectorChange = function() {
						var selectedOption = d3.select(this).property("value")
						updateSelector(selectedOption)
					}
					
					d3.select("#selectButton").on("change", selectorChange)
		
					const color_scale = d3.scaleLinear()
						.range(["white", "red"])
						.domain([domain_min, domain_max])
						.interpolate(d3.interpolateRgb);
					
					const none_color = "white"
		
					var counties_tx = map_container_tx.selectAll(".county")
						.data(map_data_tx)
						.enter()
						.append("path")
						.classed("county", true)
						.attr("d", path_generator_tx)
						.style("fill",(d) => {
							if (d.properties.stops == 0) return none_color
							else return color_scale(d.properties.relative_stops)})
						.on("mouseover", mouseover)
						.on('mousemove', mousemove)
						.on("mouseout", mouseout);
		
					var counties_ca = map_container_ca.selectAll(".county")
						.data(map_data_ca)
						.enter()
						.append("path")
						.classed("county", true)
						.attr("d", path_generator_ca)
						.style("fill",(d) => {
							if (d.properties.stops == 0) return none_color
							else return color_scale(d.properties.relative_stops)})
						.on("mouseover", mouseover)
						.on('mousemove', mousemove)
						.on("mouseout", mouseout);

					
					map_svg.append("text")
						.style("text-anchor", "middle")
						.attr("transform", "translate(" + (svg_width / 4 + 40) + ", " + (svg_height - 20) + ")")
						.style("font-size", "25px")
						.text("California");

					
					map_svg.append("text")
						.style("text-anchor", "middle")
						.attr("transform", "translate(" + (svg_width * 3/4) + ", " + (svg_height - 20) + ")")
						.style("font-size", "25px")
						.text("Texas");
		
		
					function updateMapData(date, selector) {
		
						counties_id_stops = {}
		
						if (race) {
							data_map.filter(x => (x.year == date) && x.subject_race == selector).forEach((row) => {
								counties_id_stops[row.county_name] = getCountiesInfo(row)
							})
						} else {
							data_map.filter(x => (x.year == date) && x.subject_sex == selector).forEach((row) => {
								counties_id_stops[row.county_name] = getCountiesInfo(row)
							})
						}
		
						map_data_ca.forEach(county => {
							setMapInfos(county)
						});
						map_data_tx.forEach(county => {
							setMapInfos(county)
						});
		
						counties_ca.style("fill",(d) => {if (d.properties.stops == 0) return none_color
														else return color_scale(d.properties.relative_stops)});
						counties_tx.style("fill",(d) => {if (d.properties.stops == 0) return none_color
														else return color_scale(d.properties.relative_stops)});
					}
					
		
					//------------------------------- GRAPH ----------------------------------//
		
					// set the dimensions and margins of the graph
					var chart_margin = {top: 40, right: 50, bottom: 30, left: 85};

					d3.select("#line-chart").append("svg")
								.attr("id", "chart")
								.attr("viewBox", "0 0 1200 300")
								.attr("width", "100%")

					var chart = d3.select("#chart").append("g")
								.attr("transform",
									"translate(" + chart_margin.left + "," + chart_margin.top + ")");
		
					var chart_svg = d3.select("#chart")
		
					//get dimension of the svg
					const svg_chart_viewbox = chart_svg.node().viewBox.animVal;
					const svg_chart_width = svg_chart_viewbox.width - chart_margin.left - chart_margin.right;
					const svg_chart_height = svg_chart_viewbox.height  - chart_margin.top - chart_margin.bottom;
		
					//horizontal axis and scale
					var x_chart = d3.scaleTime().range([ 0, svg_chart_width/2 - 10]);
					var x_chart_axis = d3.axisBottom().scale(x_chart);
		
					chart.append("g")
						.attr("class","x_axis")
						.attr("transform", "translate(0," + svg_chart_height + ")");
		
					chart.append("g")
						.attr("class","x_axis")
						.attr("transform", "translate("+ (svg_chart_width/2  +  10)+"," + svg_chart_height + ")");
			
					//vertical axis and scale
					var y_chart = d3.scaleLinear().range([svg_chart_height, 5]);
					var y_chart_axis = d3.axisLeft().scale(y_chart).ticks(5).tickPadding(5).tickFormat(d3.format(".2s"));
		
					const color_choices = ["steelblue", "firebrick", "goldenrod", "MediumAquaMarine"]
		
					chart.append("g")
						.attr("class","y_axis");
					
					function updateChartLine(chart_svg, data, transform, color_line) {
		
						chart_svg.append("path")
								.classed("line_graph", true)
								.datum(data)
								.transition()
								.duration(300)
								.attr("transform", "translate( "+ transform[0] + ", " + transform[1] + ")")
								.attr("d", d3.line()
										.x(function(d) { return x_chart(new Date(d.year))})
										.y(function(d) { return y_chart(parseInt(d.nb_arrest)) }))
								.attr("fill", "none")
								.attr("stroke", color_line)
								.attr("stroke-width", 1.5)
					}
		
					function resetChart(data) {
						
						chart_svg.selectAll("path").classed("line_graph", function (d,i) {
							var elem = d3.select(this)
							if (elem.classed("line_graph")) elem.remove()
						})
		
						// Create the vertical axis with call():
						y_chart.domain([0,d3.max(data.map(x => parseInt(x.nb_arrest)))]);
		
						chart.selectAll(".y_axis")
							.transition()
							.duration(300)
							.call(y_chart_axis);		
					}
		
					function updateChartLegend(chart_svg, data, pos_legend) {
						//clear legend
						chart_svg.selectAll("rect")
								.remove()
		
						chart_svg.selectAll("text").classed("legend", function (d,i) {
							var elem = d3.select(this)
							if (elem.classed("legend")) elem.remove()
						})
		
						chart_svg.selectAll("rect")
								.data(data)
								.enter()
								.append("rect")
								.attr("x", pos_legend[0])
								.attr("y", function(d, i){ return 5 + i *  20;})
								.attr("width", 10)
								.attr("height", 10)
								.style("fill", function(d, i) { 
									var color = color_choices[i];
									return color;
								});
						
						chart_svg.selectAll("legend")
								.data(data)
								.enter()
								.append("text")
								.classed("legend", true)
								.attr("x", pos_legend[0] + 14)
								.attr("y", function(d, i){ return 14 + (i *  20);})
								.text(function(d, i) {return choices[i]})
								.style("font-size", "12px")
						}
		
					function updateChartData(data, state_choice, transform) {
		
						const data_state = data.filter(x => x.state == state_choice)
		
						// Create the horizontal axis with call():
						x_chart.domain(d3.extent(data_state, function(d) { return new Date(d.year); }));
		
						chart.selectAll(".x_axis").transition()
							.duration(300)
							.call(x_chart_axis);
		
						choices.forEach((choice, i) => {
							const data_choice = (race) ? data_state.filter(x => x.subject_race == choice) : data_state.filter(x => x.subject_sex == choice)
							updateChartLine(chart_svg, data_choice, transform, color_choices[i])	
						})
								
					}
		
					resetChart(data_graph)
					updateChartData(data_graph, "ca", [chart_margin.left, chart_margin.top])
					updateChartLegend(chart_svg, choices, [svg_chart_width - 20, 0])
					updateChartData(data_graph, "tx", [svg_chart_width / 2 + chart_margin.left + 10, chart_margin.top])

					chart.append("text")
					.style("text-anchor", "middle")
					.attr("transform", "translate(" + (-chart_margin.left + 20) + ", " + (svg_chart_height/2) +") " + "rotate(-90)")
					.style("font-size", "20px")
					.text("Number of stops");
		
					//------------------------------- SLIDER ----------------------------------//
		
					function update(pos, selector) {
						//move circle
						handle.attr("cx", x(pos));
		
						//update the slider text
						label
							.attr("x", x(pos))
							.text(Math.floor(pos));
		
						var date = Math.floor(pos); //get date from slider pos
		
						updateMapData(date, selector)
					}
		
					function updateSelector(selector) {
		
						var date = Math.floor(x.invert(currentValue))
		
						updateMapData(date, selector)
					}
					
					var startDate = dates[0];
					var endDate = dates[dates.length - 1];
		
					var slider_margin = {top:0, right:50, bottom:0, left: chart_margin.left};

					d3.select("#slider_div").append("svg")
								.attr("id", "slider")
								.attr("viewBox", "0 0 1200 80")
								.attr("width", "80%")
		
					var slider_svg = d3.select('#slider');
		
					const svg_slider_viewbox = slider_svg.node().viewBox.animVal;
					const svg_slider_width = svg_slider_viewbox.width - slider_margin.left - slider_margin.right;
					const svg_slider_height = svg_slider_viewbox.height  - slider_margin.top - slider_margin.bottom;
		
					var moving_b = false; //if slider is moving
					var currentValue = 0; //slider value
					var targetValue = svg_slider_width;
					var timer = 0;
		
					function step() {
		
						const selector = selection_button.property("value");
		
						update(x.invert(currentValue), selector);
		
						currentValue = currentValue + (targetValue/50);
		
						if (currentValue > targetValue) {
							moving_b = false;
							currentValue = 0;
							update(x.invert(currentValue), selector);
							clearInterval(timer);
							play_button.text("Play");
						}
					}
		
					play_button
						.on("click", function() {
							var button = d3.select(this);
							if (button.text() == "Pause") {
								moving_b = false;
								clearInterval(timer);
								button.text("Play");
							} else {
								moving_b = true;
								timer = setInterval(step, 100); //call step() each 100ms
								button.text("Pause");
							}
						});
		
					var x = d3.scaleLinear()
							.domain([startDate, endDate])
							.range([0, svg_slider_width])
							.clamp(true);
				
					var slider = slider_svg.append("g")
							.attr("class", "slider")
							.attr("transform", "translate(" + slider_margin.left + "," + svg_slider_height/2 + ")");
		
					// slider line
					slider.append("line")
						.attr("class", "track")
						.attr("x1", x.range()[0])
						.attr("x2", x.range()[1])
						.select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
						.attr("class", "track-inset")
						.select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
						.attr("class", "track-overlay")
						.call(d3.drag()
							.on("start.interrupt", function() { slider.interrupt(); })
							.on("start drag", function() {
								currentValue = d3.event.x;
								update(x.invert(currentValue), selection_button.property("value"))
							})
						);
		
					slider.insert("g", ".track-overlay")
						.attr("class", "ticks")
						.attr("transform", "translate(0," + 18 + ")")
						.selectAll("text")
						.data(x.ticks(8))
						.enter()
						.append("text")
						.attr("fill", "CurrentColor")
						.attr("x", x)
						.attr("y", 10)
						.attr("text-anchor", "middle")
						.style("font-size", "15px")
						.text(function(d) { return d; });
		
					//text slider
					var label = slider.append("text")
						.attr("class", "label")
						.attr("text-anchor", "middle")
						.text(startDate)
						.attr("fill", "CurrentColor")
						.style("font-size", "15px")
						.attr("transform", "translate(0," + (-25) + ")")
		
					//circle slider
					var handle = slider.insert("circle", ".track-overlay")
						.attr("class", "handle")
						.attr("r", 12);
		
					
					//------------------------------- VIZ SELECTION ----------------------------------//
		
					function buttonColor(button, value, color="#39A9DB") {
						if (value) {
							button.style("background-color", color).style("border", "2px solid black")
						} else {
							button.style("background-color", "#39A9DB").style("border", "")
						}
					}
		
					function changeMap(selector) {
		
						data_map = (race) ? data_race : data_gender
		
						updateMapData(Math.floor(x.invert(currentValue)	), selector)
					}
		
					function click() {
		
						buttonColor(gender_button, gender)
						buttonColor(race_button, race)
		
						choices = choicesSelector(race)
		
						selection_button
							.selectAll('option')
							.remove()
							
						selection_button.selectAll('myOptions')
							.data(choices)
							.enter()
							.append('option')
							.classed("selector", true)
							.text(function (d) { return d; })
							.attr("value", function (d) {return d; })
		
						changeMap(selection_button.property("value"))
		
						data_graph = (race) ? data_graph_race : data_graph_gender
		
						resetChart(data_graph)
						updateChartData(data_graph, "ca", [chart_margin.left, chart_margin.top])
						updateChartData(data_graph, "tx", [svg_chart_width / 2 + chart_margin.left + 10, chart_margin.top])
						updateChartLegend(chart_svg, choices, [svg_chart_width - 20, 0])
					}
		
					gender_button.on("click", () => {
		
						if (gender) {
							gender = false;
						} else {
							gender = true;
						}
		
						race = !gender
		
						click()
					})
		
					race_button.on("click", () => {
		
						if (race) {
							race = false;
						} else {
							race = true;
						}
						gender = !race
		
						click()
					})

					map1.makeColorbar(map_svg, color_scale, [70, 50], [20, svg_height * 2/3],".1f");

					map_button.on("click", () => {

						usa_view = true;
						states_selected = {};
						num_selected = 0;

						buttonColor(gender_button, gender)
						buttonColor(race_button, race)

						selection_button
							.selectAll('option')
							.remove()

						setVisibilityButtons()

						slider_svg.remove()
						chart_svg.remove()

						d3.selectAll(".county").remove()

						map_svg.selectAll("#colorbar").classed("colorbar", function (d,i) {
							var elem = d3.select(this)
							if (elem.classed("colorbar")) elem.remove()
						})

						d3.selectAll("text").remove()

						d3.select("#map-view-top").attr("hidden", null)
						d3.select("#line-text").attr("hidden", "hidden")
						d3.select("#line-text-below").attr("hidden", "hidden")

						map_container_usa.selectAll(".state")
							.transition()
							.duration(300)
							.style("opacity", 1)
							.style("stroke-width", "1px")
					})
				});	
			}

		});
	}
}

function whenDocumentLoaded(action) {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", action);
	} else {
		// `DOMContentLoaded` already fired
		action();
	}
}

whenDocumentLoaded(() => {
	map1 = new MapPlot('map-plot');
});
