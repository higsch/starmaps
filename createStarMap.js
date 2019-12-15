function createStarMap(target, stars, starLinks, date, latlon, labelStars, showGraticule = true) {
  // data from and inspired by http://www.datasketch.es/may/code/nadieh/
  // inspiration by https://observablehq.com/@mbostock/star-map
  
  // --- setup dimensions and constants
  const width = document.querySelector(target).offsetWidth;
  const height = document.querySelector(target).offsetHeight;
  const scale = 400;

  // --- some constants
  const graticuleOpacity = 0.2;
  const constellationOpacity = 0.5;
  
  // --- setup scales
  // star colors
  const starColors = ['#9db4ff', '#aabfff', '#cad8ff', '#fbf8ff', '#fff4e8', '#ffddb4', '#ffbd6f', '#f84235', '#AC3D5A', '#5A4D6E'];
  const starTemperatures = [30000, 20000, 8500, 6800, 5600, 4500, 3000, 2000, 1000, 500];
  const scaleColor = chroma
    .scale(starColors)
    .domain(starTemperatures);

  // radius
  const scaleRadius = d3.scalePow()
    .exponent(0.8)
    .domain([-2, 6, 11])
    .range([9, 0.5, 0.1].map(d => {
      const scaleFocus = d3.scaleLinear()
        .domain([300, 2600])
        .range([0.6, 1.5]);
      return d * scaleFocus(scale);
    }));

  // --- projection
  const projection = d3.geoProjection((x, y) => d3.geoStereographicRaw(x, -y))
    .scale(scale)
    .rotate([0, -90, 0]) // North pole
    .translate([width / 2, height / 2])
    .precision(0.1)
    .clipAngle(90.001);

  // get the 90 degree radius
  const clipRadius = height / 2 - projection([0, 0])[1];

  // depending on date the sky is turned
  const raOffset = getLSTInDeg(date, latlon[1]);
  projection.rotate([-raOffset, -latlon[0], 180]);

  // --- path
  const path = d3.geoPath(projection);

  // --- graticule
  const graticule = d3.geoGraticule().stepMinor([15, 10])();
 
  // --- create the svg
  const svg = d3.select(target)
    .append('svg')
    .attr('viewBox', [0, 0, width, height]);

  const defs = svg.append('defs');

  // --- clip path
  svg.append('clipPath')
    .attr('id', 'circle-clip')
    .append('circle')
    .attr('cx', width / 2)
    .attr('cy', height / 2)
    .attr('r', clipRadius);

  const starSpace = svg.append('g')
    .attr('class', 'star-space')
    .attr('clip-path','url(#circle-clip)');

  // --- background circle
  const bg = defs.append('radialGradient')
    .attr('id', 'star-space-bg')
    .attr('cx', '50%')
    .attr('cy', '50%')
    .attr('r', '40%');

  bg.append('stop').attr('offset', '0%').style('stop-color', '#112433');
  bg.append('stop').attr('offset', '100%').style('stop-color', '#0B161F');

  starSpace.append('circle')
    .attr('cx', width / 2)
    .attr('cy', height / 2)
    .attr('r', clipRadius)
    .attr('stroke', 'none')
    .attr('fill', 'url(#star-space-bg)');
  
  // --- append the graticule
  if (showGraticule) {
    starSpace.append('path')
    .attr('d', path(graticule))
    .attr('fill', 'none')
    .attr('stroke', 'white')
    .attr('stroke-opacity', graticuleOpacity);
  }

  // --- constellations
  // form object with all the information
  const links = starLinks.map((d) => {
    // look up stars
    const source = stars.find((star) => star.hip === d.source);
    const target = stars.find((star) => star.hip === d.target);

    if (!source || !target) return;

    // get the coordinates
    const [x1, y1] = projection([source.ra * 360 / 24, source.dec]);
    const [x2, y2] = projection([target.ra * 360 / 24, target.dec]);

    return {
      x1, y1, x2, y2,
      label: d.label,
      id: d.const_id
    };
  }).filter((d) => d);

  starSpace.append('g')
    .attr('stroke-width', 1.5)
    .attr('stroke-opacity', constellationOpacity)
    .attr('stroke', 'white')
    .selectAll('.constellation')
    .data(links)
    .join('line')
      .attr('class', 'constellation')
      .attr('x1', d => d.x1)
      .attr('y1', d => d.y1)
      .attr('x2', d => d.x2)
      .attr('y2', d => d.y2);
  
  // --- draw the stars
  starSpace.selectAll('.star')
    .data(stars)
    .join('circle')
      .attr('class', d => `star ${d.hip}`)
      .attr('r', d => scaleRadius(d.mag))
      .attr('stroke', 'none')
      .attr('fill', d => d.t_eff ? scaleColor(d.t_eff) : '#ededed')
      .attr('transform', d => `translate(${projection([d.ra * 360 / 24, d.dec])})`);

  // --- the outline
  const outline = svg.append('g')
    .attr('class', 'outline')
    .attr('transform', `translate(${width / 2} ${height / 2})`);

  // create data for the degree labels
  const degs = [...Array(180).keys()].map((d) => {
    const startAngle = d * 2;
    return {
      startAngle: startAngle / 180 * Math.PI,
      endAngle: (startAngle + 1) / 180 * Math.PI
    }
  });

  // arc path generator
  const degarc = d3.arc()
    .innerRadius(clipRadius * 1.02)
    .outerRadius(clipRadius * 1.03)
    .startAngle(d => d.startAngle)
    .endAngle(d => d.endAngle)
    .cornerRadius(1);

  outline.selectAll('.degree-path')
    .data(degs)
    .join('path')
      .attr('d', degarc)
      .attr('stroke', 'none')
      .attr('fill', '#112433')

  // --- direction labels
  // const dirArc = d3.arc()
  //   .innerRadius(clipRadius * 1.05)
  //   .outerRadius(clipRadius * 1.05)
  //   .startAngle(Math.PI / 4)
  //   .endAngle(Math.PI / 4 + 2 * Math.PI);

  // outline.append('path')
  //   .attr('id', 'direction-label-path')
  //   .attr('d', dirArc)
  //   .attr('fill', 'none')
  //   .attr('stroke', 'none');

  // outline.selectAll('.direction-text')
  //   .data(['N', 'O', 'S', 'W']) // .data(['Norden', 'Osten', 'Süden', 'Westen'])
  //   .join('text')
  //     .attr('class', 'direction-text')
  //     .attr('fill', 'black')
  //     .attr('font-family', 'Geneva')
  //     .attr('text-anchor', 'middle')
  //     .attr('transform', 'rotate(270)')
  //     .append('textPath')
  //       .attr('href', '#direction-label-path')
  //       .attr('startOffset', (_, i) => `${i * 12.5 + 6.25}%`)
  //       .text(d => d);

  // --- labels
  // assemble label data
  const starLabels = labelStars.map((proper) => {
    const star = stars.find((star) => star.proper === proper);
    const { ra, dec, proper: label } = star;
    const [x, y] = projection([ra * 360 / 24, dec]);
    return {
      x, y, label,
      type: 'star'
    };
  });
  
  // get unique constellation IDs
  const uniqueConstellationIds = new Set(links.map((d) => d.id));
  
  // calculate center for each constellation
  const constellationLabels = [...uniqueConstellationIds].map((id) => {
    const constellation = links.filter((link) => link.id === id);
    const allX = [...new Set([...constellation.map((d) => d.x1), ...constellation.map((d) => d.x2)])];
    const allY = [...new Set([...constellation.map((d) => d.y1), ...constellation.map((d) => d.y2)])];
    // calculate mean
    const x = allX.reduce((a, c) => a + c) / allX.length;
    const y = allY.reduce((a, c) => a + c) / allY.length;
    
    return {
      x, y,
      label: [...new Set(constellation.map((con) => con.label))][0],
      type: 'constellation'
    };
  });
  
  const labels = [...starLabels, ...constellationLabels];

  // add to svg
  svg.append('g').selectAll('.label')
    .data(labels)
    .join('text')
      .attr('class', 'label')
      .attr('transform', d => `translate(${d.x + (d.type === 'star' ? 5 : 0)} ${d.y - (d.type === 'star' ? 5 : 0)})`)
      .attr('fill', '#ededed')
      .attr('font-family', 'Geneva')
      .attr('font-size', 12)
      .attr('text-anchor', d => d.type === 'constellation' ? 'middle' : 'start')
      .text(d => d.label);
}
