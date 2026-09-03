const React = require('react');
const { registerRoot, Composition } = require('remotion');
const { FiloPromo }    = require('./FiloPromo');
const { DonwayPromo }  = require('./DonwayPromo');
const { YongchaPromo } = require('./YongchaPromo');

var defaultFiloProps    = { hasNarration: false, hasBgm: false, slides: null, lines: null };
var defaultDonwayProps  = { hasNarration: false, hasBgm: false };
var defaultYongchaProps = { hasNarration: false, hasBgm: false };

function Root() {
  return (
    <>
      <Composition id="FiloPromo"    component={FiloPromo}    durationInFrames={900} fps={30} width={1080} height={1920} defaultProps={defaultFiloProps} />
      <Composition id="FiloReels"    component={FiloPromo}    durationInFrames={900} fps={30} width={1080} height={1920} defaultProps={defaultFiloProps} />
      <Composition id="DonwayPromo"  component={DonwayPromo}  durationInFrames={900} fps={30} width={1080} height={1920} defaultProps={defaultDonwayProps} />
      <Composition id="DonwayReels"  component={DonwayPromo}  durationInFrames={900} fps={30} width={1080} height={1920} defaultProps={defaultDonwayProps} />
      <Composition id="YongchaPromo" component={YongchaPromo} durationInFrames={900} fps={30} width={1080} height={1920} defaultProps={defaultYongchaProps} />
      <Composition id="YongchaReels" component={YongchaPromo} durationInFrames={900} fps={30} width={1080} height={1920} defaultProps={defaultYongchaProps} />
    </>
  );
}

registerRoot(Root);
