import React, { Fragment } from 'react';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';

import ButtonIcon from '~/client/components/ButtonIcon';
import ButtonSubmit from '~/client/components/ButtonSubmit';
import ContractsFestivals from '~/client/components/ContractsFestivals';
import DangerZone from '~/client/components/DangerZone';
import FooterAdmin from '~/client/components/FooterAdmin';
import FormFestivals from '~/client/components/FormFestivals';
import VoteweightsContainer from '~/client/components/VoteweightsContainer';
import ExportVotesContainer from '~/client/components/ExportVotesContainer';
import FestivalQuestionsContainer from '~/client/components/FestivalQuestionsContainer';
import HeaderAdmin from '~/client/components/HeaderAdmin';
import ViewAdmin from '~/client/components/ViewAdmin';
import notify, {
  NotificationsTypes,
} from '~/client/store/notifications/actions';
import translate from '~/common/services/i18n';
import { useEditForm } from '~/client/hooks/forms';

const AdminFestivalsEdit = () => {
  return (
    <Fragment>
      <HeaderAdmin>{translate('AdminFestivalsEdit.title')}</HeaderAdmin>
      <AdminFestivalsEditForm />
    </Fragment>
  );
};

const AdminFestivalsEditForm = () => {
  const dispatch = useDispatch();
  const { slug } = useParams();

  const returnUrl = '/admin/festivals';

  const { ButtonDelete, Form, isResourceLoading, resource } = useEditForm({
    fields: [
      'artworks',
      'description',
      'documents',
      'images',
      'online',
      'sticker',
      'subtitle',
      'title',
      'url',
    ],
    resourcePath: ['festivals', slug],
    returnUrl,
    onNotFound: () => {
      dispatch(
        notify({
          text: translate('AdminFestivalsEdit.errorNotFound'),
        }),
      );
    },
    onDeleteSuccess: ({ title }) => {
      dispatch(
        notify({
          text: translate('AdminFestivalsEdit.notificationDestroySuccess', {
            title,
          }),
        }),
      );
    },
    onUpdateSuccess: ({ title }) => {
      dispatch(
        notify({
          text: translate('AdminFestivalsEdit.notificationSuccess', {
            title,
          }),
        }),
      );
    },
    onUpdateError: () => {
      dispatch(
        notify({
          text: translate('default.errorMessage'),
          type: NotificationsTypes.ERROR,
        }),
      );
    },
  });

  return (
    <Fragment>
      <ViewAdmin>
        <Form>
          <FormFestivals questionId={resource?.question?.id} />

          {!isResourceLoading && (
            <FestivalQuestionsContainer festivalId={resource.id} />
          )}

          {!isResourceLoading && (
            <VoteweightsContainer festivalId={resource.id} />
          )}

          {!isResourceLoading && (
            <ExportVotesContainer
              name={slug}
              path={['festivals', slug, 'votes']}
            />
          )}

          <DangerZone>
            <ButtonDelete />
          </DangerZone>

          {!isResourceLoading && resource.chainId && (
            <ContractsFestivals chainId={resource.chainId} />
          )}

          <ButtonSubmit />
        </Form>
      </ViewAdmin>

      <FooterAdmin>
        <ButtonIcon isIconFlipped to={returnUrl}>
          {translate('default.buttonReturnToOverview')}
        </ButtonIcon>
      </FooterAdmin>
    </Fragment>
  );
};

export default AdminFestivalsEdit;
