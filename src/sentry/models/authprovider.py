from django.db import models
from django.utils import timezone

from bitfield import BitField
from sentry.db.models import (
    BoundedPositiveIntegerField,
    EncryptedJsonField,
    FlexibleForeignKey,
    Model,
    sane_repr,
)

from sentry.models import SentryAppInstallationForProvider

SCIM_ENABLED_PROVIDERS = ["okta", "activedirectory"]


class AuthProvider(Model):
    __core__ = True

    organization = FlexibleForeignKey("sentry.Organization", unique=True)
    provider = models.CharField(max_length=128)
    config = EncryptedJsonField()

    date_added = models.DateTimeField(default=timezone.now)
    sync_time = BoundedPositiveIntegerField(null=True)
    last_sync = models.DateTimeField(null=True)

    default_role = BoundedPositiveIntegerField(default=50)
    default_global_access = models.BooleanField(default=True)
    # TODO(dcramer): ManyToMany has the same issue as ForeignKey and we need
    # to either write our own which works w/ BigAuto or switch this to use
    # through.
    default_teams = models.ManyToManyField("sentry.Team", blank=True)

    flags = BitField(
        flags=(
            ("allow_unlinked", "Grant access to members who have not linked SSO accounts."),
            ("scim_enabled", "Enable SCIM for user and group provisioning and syncing"),
        ),
        default=0,
    )

    class Meta:
        app_label = "sentry"
        db_table = "sentry_authprovider"

    __repr__ = sane_repr("organization_id", "provider")

    def __str__(self):
        return self.provider

    def get_provider(self):
        from sentry.auth import manager

        return manager.get(self.provider, **self.config)

    def get_scim_token(self):
        if self.flags.scim_enabled:
            sentry_app_installation = SentryAppInstallationForProvider.objects.get(
                organization=self.organization, provider=f"{self.provider}_scim"
            )
            scim_auth_token = sentry_app_installation.get_token(
                self.organization_id, provider=f"{self.provider}_scim"
            )
            return scim_auth_token
        else:
            return None

    def get_audit_log_data(self):
        return {"provider": self.provider, "config": self.config}
