import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import SubmitTSV from './SubmitTSV';
import DataModelGraph from '../DataModelGraph/DataModelGraph';
import SubmitForm from './SubmitForm';
import Spinner from '../components/Spinner';
import './ProjectSubmission.less';
import { useArboristUI } from '../configs';
import { userHasMethodOnProject, isRootUrl, isProgramUrl, userHasSheepdogProgramAdmin, userHasSheepdogProjectAdmin } from '../authMappingUtils';
import { fetchWithCreds } from '../actions';
import { graphqlPath } from '../localconf';

const ProjectSubmission = (props) => {
  console.log("props");
  console.log(props);
  const query = `{
       project (first:0){
         dbgap_accession_number
         name
         id
         submitter_id
	 details
	 contact
       }
    }`;
  const variables = null;
  const body = { query, variables };
  const res = fetchWithCreds({
    path: graphqlPath,
    method: 'POST',
    body: JSON.stringify(body),
  });
  const pri = {};

  res.then((result) => {pri.done = true;pri.data=result;
    var pi = document.getElementById("projectinfo");
    var path = window.location.pathname;
    result.data.data.project.forEach(prj =>  
    {
      if (pi.innerHTML.length < 10 && path.indexOf(prj.dbgap_accession_number) != -1) {
        if (path.indexOf("TAONGA-RATTUSRATTUS") != -1) {
          var text = "";
          text += "<h4>Project ID: TAONGA-RATTUSRATTUS</h4>";
          text += "<h4>Project name: " + prj.name + "</h4><br/><p><b>Description: </b>" + prj.details + "</p>";
          text += "<br/><p><b>Number of files: </b>1</p>";
          text += "<br/><p><b>PI: </b> Dr. Florian Pichlmueller</p>";
          if (prj.contact) {
            text += "<p><b>Contact: </b><a href=\"mailto:" + prj.contact + "\">" + prj.contact + "</a></p>";
          }
          text += "<br/><br/>";
          text += "<p>If you would like to access this data set, please fill out the following form.</p>"
          text += "<b><a target=\"_blank\" href=\"https://docs.google.com/forms/d/e/1FAIpQLScerXN4MLIAgnLfrHbvheMwtM6gtDNaluZ3c_-xEiot2hc6DA/viewform?usp=pp_url&entry.129341974=Rattus+Rattus\">Apply for access</a></b>"
          text += "<br/><br/>";
          pi.innerHTML += text;
        } else if (path.indexOf("TAONGA-PHORMIDIUM")) {
          var text = "<h4>Project name: " + prj.name + "</h4><br/><p><b>Description: </b>" + prj.details + "</p>";
          text += "<br/><p><b>Number of files: </b>30</p>";
          text += "<br/><p><b>PI: </b> Dr. Kim Handley</p>";
          if (prj.contact) {
            text += "<p><b>Contact: </b><a href=\"mailto:" + prj.contact + "\">" + prj.contact + "</a></p>";
          }
          text += "<br/><br/>";
          pi.innerHTML += text;
        }
      }
    });

	    
	    console.log(pri);});


  // hack to detect if dictionary data is available, and to trigger fetch if not
  if (!props.dataIsReady) {
    props.onGetCounts(props.typeList, props.project, props.dictionary);
  }
  // Passing children in as props allows us to swap in different containers -
  // dumb, redux, ...
  const MySubmitForm = props.submitForm;
  const MySubmitTSV = props.submitTSV;
  const MyDataModelGraph = props.dataModelGraph;
  const displayProjectInfo = (pri) => {
    if (!props.infoIsReady) {
      if (props.project !== '_root') {
        return <div id="projectinfo" />;
      }
      return null;
    }
    return <div id="projectinfo" />;
    //return <p> { pri.data.data.project[0].name } </p>;
  };
  const displayData = () => {
    if (!props.dataIsReady) {
      if (props.project !== '_root') {
        return <Spinner />;
      }
      return null;
    }
    return <MyDataModelGraph project={props.project} />;
  };
  const displaySubmissionUIComponents = (project, userAuthMapping) => {
    return null;
    if (
      !useArboristUI
      || (isRootUrl(project) && userHasSheepdogProgramAdmin(userAuthMapping))
      || (isProgramUrl(project) && userHasSheepdogProjectAdmin(userAuthMapping))
      || userHasMethodOnProject('create', project, userAuthMapping)
      || userHasMethodOnProject('update', project, userAuthMapping)
    ) {
      return (
        <React.Fragment>
          <MySubmitForm />
          <MySubmitTSV project={project} />
        </React.Fragment>
      );
    }
    return null;
  };
  return (
    <div className='project-submission'>
      <h2 className='project-submission__title'>{props.project}</h2>
      {
        <Link className='project-submission__link' to={`/${props.project}/search`}>browse nodes</Link>
      }
      { displaySubmissionUIComponents(props.project, props.userAuthMapping) }
      { displayProjectInfo(pri) }
      { displayData() }
    </div>
  );
};
ProjectSubmission.propTypes = {
  project: PropTypes.string.isRequired,
  dataIsReady: PropTypes.bool,
  infoIsReady: PropTypes.bool,
  dictionary: PropTypes.object.isRequired,
  submitForm: PropTypes.func,
  submitTSV: PropTypes.func,
  dataModelGraph: PropTypes.func,
  onGetCounts: PropTypes.func.isRequired,
  typeList: PropTypes.array,
  userAuthMapping: PropTypes.object.isRequired,
};
ProjectSubmission.defaultProps = {
  dataIsReady: false,
  infoIsReady: false,
  submitForm: SubmitForm,
  submitTSV: SubmitTSV,
  dataModelGraph: DataModelGraph,
  typeList: [],
};
export default ProjectSubmission;

