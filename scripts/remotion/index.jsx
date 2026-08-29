const React = require('react');
const { registerRoot, Composition } = require('remotion');
const { FiloPromo }    = require('./FiloPromo');
const { DonwayPromo }  = require('./DonwayPromo');
const { YongchaPromo } = require('./YongchaPromo');

function Root() {
  return (
    <>
      <Composition id="FiloPromo"    component={FiloPromo}    durationInFrames={900} fps={30} width={1080} height={1920} />
      <Composition id="FiloReels"    component={FiloPromo}    durationInFrames={900} fps={30} width={1080} height={1920} />
      <Composition id="DonwayPromo"  component={DonwayPromo}  durationInFrames={900} fps={30} width={1080} height={1920} />
      <Composition id="DonwayReels"  component={DonwayPromo}  durationInFrames={900} fps={30} width={1080} height={1920} />
      <Composition id="YongchaPromo" component={YongchaPromo} durationInFrames={900} fps={30} width={1080} height={1920} />
      <Composition id="YongchaReels" component={YongchaPromo} durationInFrames={900} fps={30} width={1080} height={1920} />
    </>
  );
}

registerRoot(Root);
